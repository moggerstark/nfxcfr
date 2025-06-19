const { EmbedBuilder } = require('discord.js');
const { getRandomColor } = require('../utils/colors');
const { getRandomGif } = require('../utils/gifs');

module.exports = {
  name: 'nfxpray',
  aliases: ['np'],
  cooldown: 60, // 1 minute
  async execute(message, args, client) {
    try {
      const messages = [
        'Good vibes sent your way! 🙏✨',
        'The universe smiles upon you! 🌟',
        'Your prayers bring positivity! 😊'
      ];
      const prayer = messages[Math.floor(Math.random() * messages.length)];

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Prayer`)
        .setDescription(prayer)
        .setColor(getRandomColor())
        .setThumbnail(await getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}, Error!`)
        .setDescription(`Something went wrong: ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('nfxpray error:', error);
    }
  }
};