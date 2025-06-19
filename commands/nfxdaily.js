const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../utils/database');
const { getRandomColor } = require('../utils/colors');
const { getRandomGif } = require('../utils/gifs');

module.exports = {
  name: 'nfxdaily',
  aliases: ['ndaily'],
  cooldown: 86400,
  async execute(message, args, client) {
    try {
      const serverId = message.guild.id;
      const db = getDb(serverId);
      const user = await new Promise((resolve, reject) => {
        db.get(
          'SELECT nfx, total_earned FROM users WHERE user_id = ?',
          [message.author.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      const reward = Math.random() < 0.01 ? Math.floor(Math.random() * 401 + 100) : Math.floor(Math.random() * 91 + 10);
      await new Promise((resolve, reject) => {
        if (!user) {
          db.run(
            'INSERT INTO users (user_id, nfx, total_earned) VALUES (?, ?, ?)',
            [message.author.id, reward, reward],
            (err) => { if (err) reject(err); else resolve(); }
          );
        } else {
          db.run(
            'UPDATE users SET nfx = nfx + ?, total_earned = total_earned + ? WHERE user_id = ?',
            [reward, reward, message.author.id],
            (err) => { if (err) reject(err); else resolve(); }
          );
        }
      });

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Daily Reward!`)
        .setDescription(`You claimed ${reward} ₣! Come back tomorrow for more! 🎉`)
        .setColor(getRandomColor())
        .setThumbnail(await getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });

      db.close();
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}, Error!`)
        .setDescription(`Something went wrong: ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('nfxdaily error:', error);
    }
  }
};