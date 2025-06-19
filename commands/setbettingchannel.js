const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db', (err) => {
  if (err) console.error('Database connection error:', err);
});

// Utilities
const gifs = [
  "https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  // Add your 80 GIF URLs here
  ...Array(78).fill("https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif")
];

const getRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

module.exports = {
  name: 'setbettingchannel',
  aliases: ['sbc'],
  cooldown: 3,
  async execute(message, args, client) {
    try {
      if (!message.member.permissions.has('ADMINISTRATOR')) {
        return message.channel.send({ embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Oops! 💥**`)
          .setDescription('🚫 Ye command sirf admins ke liye hai! 😢')
          .setColor(0xff0000)
          .setThumbnail(getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' })] });
      }

      const channel = message.mentions.channels.first() || message.channel;
      const serverId = message.guild.id.toString();
      const gifUrl = getRandomGif();

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO server_settings (server_id, betting_channel_id) VALUES (?, ?)',
          [serverId, channel.id.toString()],
          err => err ? reject(err) : resolve()
        );
      });

      const embed = new EmbedBuilder()
        .setTitle('🎰 Betting Channel Set!')
        .setDescription(`Betting channel ab ${channel.toString()} hai! 🪙 !bet command wahi kaam karega.`)
        .setColor(0x00FF00)
        .setThumbnail(gifUrl)
        .setFooter({ text: 'Developed by Moggerstark 🐾' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Set betting channel error:', error);
      await message.channel.send({ embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! 💥**`)
        .setDescription(`⚠️ Betting channel set karne mein error: ${error.message}! 👾`)
        .setColor(0xff0000)
        .setThumbnail(getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' })] });
    }
  }
};