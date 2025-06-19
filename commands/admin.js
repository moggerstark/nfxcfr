const { EmbedBuilder } = require('discord.js');

// Assuming global db is passed via client (set in index.js)
module.exports = {
  name: 'admin',
  aliases: ['adm'],
  async execute(message, args, client) {
    try {
      const db = client.db; // Use global db from index.js
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Nope!`)
          .setDescription('You need admin permissions for this!')
          .setColor(0xff0000)
          .setThumbnail(await require('../utils/gifs').getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        return;
      }

      const serverId = message.guild.id;
      const subcommand = args[0]?.toLowerCase();

      if (!subcommand) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Admin Commands`)
          .setDescription('Available commands:\n`!admin setliveleaderboard <channel>`\n`!admin addcash <@user> <amount>`\n`!admin additem <item> <price>`')
          .setColor(require('../utils/colors').getRandomColor())
          .setThumbnail(await require('../utils/gifs').getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        return;
      }

      if (subcommand === 'setliveleaderboard') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}, Oops!`)
            .setDescription('Mention a valid channel! e.g., `!admin setliveleaderboard #leaderboard`')
            .setColor(require('../utils/colors').getRandomColor())
            .setThumbnail(await require('../utils/gifs').getRandomGif())
            .setFooter({ text: 'Developed by Moggerstark' });
          await message.channel.send({ embeds: [embed] });
          return;
        }

        await new Promise((resolve, reject) => {
          db.run(
            'INSERT OR REPLACE INTO settings (server_id, leaderboard_channel) VALUES (?, ?)',
            [serverId, channel.id],
            (err) => (err ? reject(err) : resolve())
          );
        });

        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Success!`)
          .setDescription(`Leaderboard channel set to ${channel}!`)
          .setColor(require('../utils/colors').getRandomColor())
          .setThumbnail(await require('../utils/gifs').getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
      } else if (subcommand === 'addcash') {
        const user = message.mentions.users.first();
        const amount = parseInt(args[2]);
        if (!user || !amount || amount < 1) {
          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}, Oops!`)
            .setDescription('Use `!admin addcash <@user> <amount>`!')
            .setColor(require('../utils/colors').getRandomColor())
            .setThumbnail(await require('../utils/gifs').getRandomGif())
            .setFooter({ text: 'Developed by Moggerstark' });
          await message.channel.send({ embeds: [embed] });
          return;
        }

        await new Promise((resolve, reject) => {
          db.get('SELECT nfx, total_earned FROM users WHERE user_id = ?', [user.id], (err, row) => {
            if (err) return reject(err);
            if (!row) {
              db.run(
                'INSERT INTO users (user_id, nfx, total_earned) VALUES (?, ?, ?)',
                [user.id, amount, amount],
                (err) => (err ? reject(err) : resolve())
              );
            } else {
              db.run(
                'UPDATE users SET nfx = nfx + ?, total_earned = total_earned + ? WHERE user_id = ?',
                [amount, amount, user.id],
                (err) => (err ? reject(err) : resolve())
              );
            }
          });
        });

        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Success!`)
          .setDescription(`Added ${amount} ₣ to ${user}!`)
          .setColor(require('../utils/colors').getRandomColor())
          .setThumbnail(await require('../utils/gifs').getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
      } else if (subcommand === 'additem') {
        const item = args.slice(1, -1).join(' ');
        const price = parseInt(args[args.length - 1]);
        if (!item || !price || price < 1) {
          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}, Oops!`)
            .setDescription('Use `!admin additem <item> <price>`!')
            .setColor(require('../utils/colors').getRandomColor())
            .setThumbnail(await require('../utils/gifs').getRandomGif())
            .setFooter({ text: 'Developed by Moggerstark' });
          await message.channel.send({ embeds: [embed] });
          return;
        }

        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO shop (item, price) VALUES (?, ?)',
            [item, price],
            (err) => (err ? reject(err) : resolve())
          );
        });

        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Success!`)
          .setDescription(`Added ${item} to shop for ${price} ₣!`)
          .setColor(require('../utils/colors').getRandomColor())
          .setThumbnail(await require('../utils/gifs').getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('Invalid subcommand! Try `!admin` for help.')
          .setColor(require('../utils/colors').getRandomColor())
          .setThumbnail(await require('../utils/gifs').getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}, Error!`)
        .setDescription(`Something went wrong: ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('Admin error:', error);
    }
  }
};