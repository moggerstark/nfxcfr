const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sqlite3 = require('sqlite3').verbose();

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers] 
});
client.commands = new Collection();
let db;
const gifs = [
  "https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  ...Array(78).fill("https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif")
];
const cooldowns = new Collection();
const voiceIntervals = new Map(); // Track voice intervals

const dbPath = '/home/runner/workspace/databases/guild.db';
const setupDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const dir = path.dirname(dbPath);
    fs.mkdir(dir, { recursive: true }).then(() => {
      db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          console.error('Database error:', err.message);
          fs.writeFile(dbPath, '').catch(err => console.error('Failed to create db:', err));
          setTimeout(() => {
            db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
              if (err) reject(err);
              else resolve(db);
            });
          }, 1000);
        } else resolve(db);
      });
    }).catch(err => reject(err));
  });
};

const loadPokemonData = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        nfx INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        given INTEGER DEFAULT 0,
        taken INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        invites INTEGER DEFAULT 0,
        messages INTEGER DEFAULT 0,
        voice_minutes INTEGER DEFAULT 0
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        server_id TEXT PRIMARY KEY,
        msg_channel TEXT,
        leaderboard_channel TEXT,
        ticket_category TEXT,
        ticket_staff_role TEXT,
        ticket_role TEXT,
        log_channel TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS shop (
        item TEXT PRIMARY KEY,
        price INTEGER
      )`);
      resolve();
    });
  });
};

async function loadCommands() {
  await fs.mkdir(path.join(__dirname, 'commands'), { recursive: true });
  const files = (await fs.readdir(path.join(__dirname, 'commands'))).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(__dirname, 'commands', file));
    client.commands.set(command.name, command);
    console.log(`Loaded command: ${command.name}`);
  }
}

const getRandomColor = () => [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF][Math.floor(Math.random() * 6)];
const getRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

client.once('ready', async () => {
  console.log(`Bot online as ${client.user.tag}`);
  await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });
  await fs.appendFile(path.join(__dirname, 'logs', 'bot.log'), `[${new Date().toISOString()}] Bot started as ${client.user.tag}\n`);
  await setupDatabase().then(async () => {
    await loadPokemonData(db);
    await loadCommands();
    client.db = db;
    console.log('Loaded all commands');

    // Invite tracking
    client.invites = new Collection();
    client.inviteCounts = new Collection();
    await client.guilds.cache.forEach(guild => {
      guild.invites.fetch().then(invites => {
        client.invites.set(guild.id, invites);
        const inviteCount = {};
        invites.forEach(invite => inviteCount[invite.code] = invite.uses);
        client.inviteCounts.set(guild.id, inviteCount);
      }).catch(console.error);
    });
  }).catch(err => {
    console.error('Database setup failed:', err);
    fs.appendFileSync(path.join(__dirname, 'logs', 'bot.log'), `[${new Date().toISOString()}] Database setup failed: ${err.message}\n`);
  });

  // Voice state update
  client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;
    if (newState.channelId && !oldState.channelId && !newState.deaf) {
      const interval = setInterval(() => {
        db.run('UPDATE users SET voice_minutes = voice_minutes + 1, total_earned = total_earned + 2 WHERE user_id = ?', [userId], err => {
          if (err) console.error('Voice update error:', err);
        });
      }, 60000);
      voiceIntervals.set(userId, interval);
    } else if (!newState.channelId && oldState.channelId) {
      const interval = voiceIntervals.get(userId);
      if (interval) {
        clearInterval(interval);
        voiceIntervals.delete(userId);
      }
    }
  });

  // Invite tracking
  client.on('inviteCreate', invite => {
    client.invites.set(invite.guild.id, (client.invites.get(invite.guild.id) || new Collection()).set(invite.code, invite));
  });

  client.on('inviteDelete', invite => {
    client.invites.set(invite.guild.id, (client.invites.get(invite.guild.id) || new Collection()).filter(i => i.code !== invite.code));
  });

  client.on('guildMemberAdd', async member => {
    const invites = await member.guild.invites.fetch();
    const newInvite = invites.find(i => (client.inviteCounts.get(member.guild.id)?.[i.code] || 0) < i.uses);
    if (newInvite) {
      db.run('UPDATE users SET invites = invites + 1, total_earned = total_earned + 100 WHERE user_id = ?', [newInvite.inviter.id], err => {
        if (err) console.error('Invite add error:', err);
      });
      client.inviteCounts.set(member.guild.id, { ...client.inviteCounts.get(member.guild.id), [newInvite.code]: newInvite.uses });
    }
  });

  client.on('guildMemberRemove', async member => {
    const invites = await member.guild.invites.fetch();
    const oldInvite = client.invites.get(member.guild.id)?.find(i => i.uses > (client.inviteCounts.get(member.guild.id)?.[i.code] || 0));
    if (oldInvite) {
      db.run('UPDATE users SET nfx = nfx - 100, total_earned = total_earned - 100 WHERE user_id = ? AND nfx >= 100', [oldInvite.inviter.id], err => {
        if (err) console.error('Invite remove error:', err);
      });
    }
  });
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) {
    console.log(`Unknown command: ${commandName}`);
    return;
  }

  const now = Date.now();
  const cooldownAmount = 10 * 1000;
  const userCooldown = (client.cooldowns || new Collection()).get(`${commandName}-${message.author.id}`);

  if (userCooldown && now < userCooldown) {
    const timeLeft = Math.ceil((userCooldown - now) / 1000);
    await message.reply({ embeds: [new EmbedBuilder().setTitle('⏳ Cooldown').setDescription(`Wait ${timeLeft}s for !${commandName}!`).setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    return;
  }

  try {
    // Define commands here to ensure they are loaded
    async function executeSetLiveLeaderboard(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set leaderboard!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a channel! e.g., `!setliveleaderboard #channel`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, leaderboard_channel) VALUES (?, ?)', [message.guild.id, channel.id], err => (err ? reject(err) : resolve())));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Leaderboard set to ${channel}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeAddCash(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can add cash!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!user || !amount || amount < 1) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use `!addcash @user amount`!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      db.get('SELECT nfx FROM users WHERE user_id = ?', [user.id], (err, row) => {
        if (err) {
          console.error(err);
          message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Database error!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          return;
        }
        if (!row) {
          db.run('INSERT INTO users (user_id, nfx) VALUES (?, ?)', [user.id, amount], err => {
            if (err) console.error(err);
            else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Added ${amount} ₣ to ${user}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          });
        } else {
          db.run('UPDATE users SET nfx = nfx + ? WHERE user_id = ?', [amount, user.id], err => {
            if (err) console.error(err);
            else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Added ${amount} ₣ to ${user}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          });
        }
      });
    }

    async function executeShopAdd(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can add shop items!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const item = args.slice(0, -1).join(' ');
      const price = parseInt(args[args.length - 1]);
      if (!item || !price || price < 1) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use `!shopadd item price`!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      db.run('INSERT INTO shop (item, price) VALUES (?, ?)', [item, price], err => {
        if (err) {
          console.error(err);
          message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Failed to add item!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        } else {
          message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Added ${item} for ${price} ₣!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        }
      });
    }

    async function executeShopRemove(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can remove shop items!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const item = args[0];
      if (!item) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use `!shopremove item`!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      db.run('DELETE FROM shop WHERE item = ?', [item], err => {
        if (err) {
          console.error(err);
          message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Failed to remove item!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        } else {
          message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Removed ${item} from shop!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        }
      });
    }

    async function executeSetTc(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set ticket category!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel || channel.type !== 4) { // 4 is category channel type
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a valid category channel! e.g., `!settc #category`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, ticket_category) VALUES (?, ?)', [message.guild.id, channel.id], err => (err ? reject(err) : resolve())));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Ticket category set to ${channel}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeSetTrStaff(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set ticket staff role!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const role = message.mentions.roles.first();
      if (!role) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a valid role! e.g., `!settrstaff @role`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, ticket_staff_role) VALUES (?, ?)', [message.guild.id, role.id], err => (err ? reject(err) : resolve())));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Ticket staff role set to ${role}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeSetTr(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set ticket role!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const role = message.mentions.roles.first();
      if (!role) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a valid role! e.g., `!settr @role`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, ticket_role) VALUES (?, ?)', [message.guild.id, role.id], err => (err ? reject(err) : resolve())));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Ticket role set to ${role}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeTClose(message, args) {
      const serverId = message.guild.id;
      const settings = await new Promise((resolve, reject) => db.get('SELECT ticket_staff_role, log_channel FROM settings WHERE server_id = ?', [serverId], (err, row) => (err ? reject(err) : resolve(row))));
      if (!message.member.permissions.has('ADMINISTRATOR') && (!settings?.ticket_staff_role || !message.member.roles.cache.has(settings.ticket_staff_role))) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins or ticket staff can close tickets!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const channel = message.channel;
      if (!channel.name.startsWith('ticket-')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use this in a ticket channel!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const ticketRoleId = settings?.ticket_role;
      if (ticketRoleId) {
        const member = message.guild.members.cache.get(channel.topic || message.author.id);
        if (member && member.roles.cache.has(ticketRoleId)) {
          await member.roles.remove(ticketRoleId).catch(console.error);
        }
      }
      const logChannelId = settings?.log_channel;
      if (logChannelId) {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
          const transcript = `🎫 Closed by ${message.author.tag} at ${new Date().toISOString()}\n📌 Channel: ${channel.name}`;
          await logChannel.send({ content: transcript });
        }
      }
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription('Ticket closed!').setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeSetLogChannel(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set log channel!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a channel! e.g., `!setlogchannel #channel`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, log_channel) VALUES (?, ?)', [message.guild.id, channel.id], err => (err ? reject(err) : resolve())));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Log channel set to ${channel}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeAddNfx(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can add NFX!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!user || !amount || amount < 1) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use `!addnfx @user amount`!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      db.get('SELECT nfx FROM users WHERE user_id = ?', [user.id], (err, row) => {
        if (err) {
          console.error(err);
          message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Database error!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          return;
        }
        if (!row) {
          db.run('INSERT INTO users (user_id, nfx) VALUES (?, ?)', [user.id, amount], err => {
            if (err) console.error(err);
            else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Added ${amount} ₣ to ${user}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          });
        } else {
          db.run('UPDATE users SET nfx = nfx + ? WHERE user_id = ?', [amount, user.id], err => {
            if (err) console.error(err);
            else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Added ${amount} ₣ to ${user}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          });
        }
      });
    }

    async function executeRemoveNfx(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can remove NFX!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const user = message.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!user || !amount || amount < 0) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use `!removenfx @user amount`!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      db.get('SELECT nfx FROM users WHERE user_id = ?', [user.id], (err, row) => {
        if (err) {
          console.error(err);
          message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Database error!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          return;
        }
        if (!row || row.nfx < amount) {
          message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Insufficient NFX!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
          return;
        }
        db.run('UPDATE users SET nfx = nfx - ? WHERE user_id = ?', [amount, user.id], err => {
          if (err) console.error(err);
          else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Removed ${amount} ₣ from ${user}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        });
      });
    }

    async function executeResetNfx(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can reset NFX!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const user = message.mentions.users.first();
      if (!user) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Use `!resetnfx @user`!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      db.run('UPDATE users SET nfx = 0 WHERE user_id = ?', [user.id], err => {
        if (err) console.error(err);
        else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Reset NFX for ${user} to 0!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
      });
    }

    async function executeResetServer(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can reset server!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const serverId = message.guild.id;
      db.run('DELETE FROM users WHERE user_id NOT LIKE ?', [`%${serverId}%`], err => {
        if (err) console.error(err);
        else message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription('Server NFX reset!').setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
      });
    }

    async function executeSetMsgChannel(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set message channel!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a channel! e.g., `!setmsgchannel #channel`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, msg_channel) VALUES (?, ?)', [message.guild.id, channel.id], err => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          console.log(`Set msg_channel to ${channel.id} for ${message.guild.id}`);
          resolve();
        }
      }));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Message channel set to ${channel}! Earn 1 ₣ per message here.`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executeSetBotChannel(message, args) {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set bot channel!').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a channel! e.g., `!setbotchannel #channel`').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
        return;
      }
      await new Promise((resolve, reject) => db.run('INSERT OR REPLACE INTO settings (server_id, bot_channel) VALUES (?, ?)', [message.guild.id, channel.id], err => (err ? reject(err) : resolve())));
      await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Bot channel set to ${channel}!`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    async function executePing(message, args) {
      const latency = Date.now() - message.createdTimestamp;
      await message.reply({ embeds: [new EmbedBuilder().setTitle('🏓 Ping').setDescription(`Latency: ${latency}ms | WebSocket: ${client.ws.ping}ms`).setColor(getRandomColor()).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    // Execute the command
    switch (commandName) {
      case 'setliveleaderboard': await executeSetLiveLeaderboard(message, args); break;
      case 'addcash': await executeAddCash(message, args); break;
      case 'shopadd': await executeShopAdd(message, args); break;
      case 'shopremove': await executeShopRemove(message, args); break;
      case 'settc': await executeSetTc(message, args); break;
      case 'settrstaff': await executeSetTrStaff(message, args); break;
      case 'settr': await executeSetTr(message, args); break;
      case 'tclose': await executeTClose(message, args); break;
      case 'setlogchannel': await executeSetLogChannel(message, args); break;
      case 'addnfx': await executeAddNfx(message, args); break;
      case 'removenfx': await executeRemoveNfx(message, args); break;
      case 'resetnfx': await executeResetNfx(message, args); break;
      case 'resetserver': await executeResetServer(message, args); break;
      case 'setmsgchannel': await executeSetMsgChannel(message, args); break;
      case 'setbotchannel': await executeSetBotChannel(message, args); break;
      case 'ping': await executePing(message, args); break;
      default: await message.reply({ embeds: [new EmbedBuilder().setTitle('❓ Unknown').setDescription(`Command !${commandName} not found!`).setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
    }

    // Update messages for setmsgchannel
    const msgChannel = await new Promise((resolve, reject) => db.get('SELECT msg_channel FROM settings WHERE server_id = ?', [message.guild.id], (err, row) => (err ? reject(err) : resolve(row?.msg_channel))));
    if (msgChannel && message.channel.id === msgChannel && !message.author.bot && commandName !== 'setmsgchannel') {
      db.run('UPDATE users SET messages = messages + 1, total_earned = total_earned + 1 WHERE user_id = ?', [message.author.id], err => {
        if (err) console.error('Message update error:', err);
        else console.log(`Message counted for ${message.author.id} in ${msgChannel}`);
      });
      db.run('INSERT OR IGNORE INTO users (user_id) VALUES (?)', [message.author.id], err => {
        if (err) console.error('Insert user error:', err);
      });
    }
  } catch (error) {
    console.error(`Error in command:`, error);
    await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Command failed! Check logs.').setColor(0xff0000).setThumbnail(getRandomGif()).setFooter({ text: 'Developed by Moggerstark' })] });
  }
});

client.on('channelDelete', async channel => {
  const serverId = channel.guild.id;
  const settings = await new Promise((resolve, reject) => db.get('SELECT ticket_role FROM settings WHERE server_id = ?', [serverId], (err, row) => (err ? reject(err) : resolve(row))));
  if (channel.name.startsWith('ticket-')) {
    const userId = channel.topic || channel.guild.members.cache.find(m => m.roles.cache.has(settings?.ticket_role))?.id;
    if (userId) {
      const member = await channel.guild.members.fetch(userId).catch(() => null);
      if (member && settings?.ticket_role) await member.roles.remove(settings.ticket_role).catch(console.error);
    }
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await fs.appendFile(path.join(__dirname, 'logs', 'bot.log'), `[${new Date().toISOString()}] Bot shutting down\n`);
  if (db) db.close(err => (err ? console.error('Close error:', err) : console.log('DB closed')));
  process.exit(0);
});

const token = process.env.TOKEN;
if (!token) {
  console.error('No token in .env!');
  process.exit(1);
}
client.login(token);