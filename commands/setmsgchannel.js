// /commands/setmsgchannel.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'setmsgchannel',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      await message.reply({ embeds: [new EmbedBuilder().setTitle('⛔ Access Denied').setDescription('Only admins can set the message channel!').setColor(0xff0000).setThumbnail(["https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif", "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"][Math.floor(Math.random() * 2)]).setFooter({ text: 'Developed by Moggerstark' })] });
      return;
    }
    const channel = message.mentions.channels.first();
    if (!channel) {
      await message.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Mention a valid channel! e.g., `!setmsgchannel #channel`').setColor(0xff0000).setThumbnail(["https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif", "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"][Math.floor(Math.random() * 2)]).setFooter({ text: 'Developed by Moggerstark' })] });
      return;
    }
    const serverId = message.guild.id;
    const db = client.db;
    await new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO settings (server_id, msg_channel) VALUES (?, ?)', [serverId, channel.id], err => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          console.log(`Set msg_channel to ${channel.id} for server ${serverId}`);
          resolve();
        }
      });
    });
    await message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Success').setDescription(`Message channel set to ${channel}! Messages here earn 1 ₣ each.`).setColor([0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF][Math.floor(Math.random() * 6)]).setThumbnail(["https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif", "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"][Math.floor(Math.random() * 2)]).setFooter({ text: 'Developed by Moggerstark' })] });
  }
};