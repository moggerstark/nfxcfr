const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../utils/database');
const { getRandomColor } = require('../utils/colors');
const { getRandomGif } = require('../utils/gifs');

module.exports = {
  name: 'quest',
  aliases: ['q'],
  cooldown: 10,
  async execute(message, args, client) {
    let db;
    try {
      const serverId = message.guild.id;
      db = getDb(serverId);
      const quests = [
        { task: 'Catch 3 Pokémon', reward: 10, progressKey: 'caught' },
        { task: 'Win 2 spins', reward: 15, progressKey: 'wins' },
        { task: 'Send 50 messages', reward: 20, progressKey: 'messages' }
      ];
      const quest = quests[Math.floor(Math.random() * quests.length)];

      const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE user_id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const progress = user ? user[quest.progressKey] || 0 : 0;
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Quest`)
        .setDescription(`🎯 **Task**: ${quest.task}\n📊 **Progress**: ${progress}\n🏆 **Reward**: ${quest.reward} ₣`)
        .setColor(getRandomColor())
        .setThumbnail(await getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' });
      const msg = await message.channel.send({ embeds: [embed] });

      // Animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      embed.setDescription(`🎯 **Task**: ${quest.task}\n📊 **Progress**: ${progress}\n🏆 **Reward**: ${quest.reward} ₣\n✨ Quest active!`);
      await msg.edit({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}, Error!`)
        .setDescription(`Something went wrong: ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('Quest error:', error);
    } finally {
      if (db) db.close();
    }
  }
};