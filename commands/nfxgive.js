const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../utils/database');
const { getRandomColor } = require('../utils/colors');
const { getRandomGif } = require('../utils/gifs');
const { renderCoinStack } = require('../utils/animations');

module.exports = {
  name: 'nfxgive',
  aliases: ['ng'],
  cooldown: 60, // 1 minute to prevent spam
  async execute(message, args, client) {
    try {
      if (!args[0] || !message.mentions.users.size) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('Please mention a user! e.g., `!nfxgive @user 100`')
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        return;
      }

      const recipient = message.mentions.users.first();
      if (recipient.id === message.author.id) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('You can\'t give ₣ to yourself!')
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        return;
      }

      const amount = parseInt(args[1]);
      if (!amount || amount < 1 || amount > 1000) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('Please give a valid amount (1-1000 ₣)! e.g., `!nfxgive @user 100`')
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        return;
      }

      const serverId = message.guild.id;
      const db = getDb(serverId);
      const sender = await new Promise((resolve, reject) => {
        db.get(
          'SELECT nfx, given FROM users WHERE user_id = ?',
          [message.author.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!sender || sender.nfx < amount) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('You don\'t have enough ₣!')
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        db.close();
        return;
      }

      if ((sender.given || 0) + amount > 1000) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('You can only give up to 1000 ₣ per day!')
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        db.close();
        return;
      }

      const recipientData = await new Promise((resolve, reject) => {
        db.get(
          'SELECT nfx, taken FROM users WHERE user_id = ?',
          [recipient.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // Update sender
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET nfx = nfx - ?, given = given + ? WHERE user_id = ?',
          [amount, amount, message.author.id],
          (err) => { if (err) reject(err); else resolve(); }
        );
      });

      // Update recipient
      await new Promise((resolve, reject) => {
        if (!recipientData) {
          db.run(
            'INSERT INTO users (user_id, nfx, taken) VALUES (?, ?, ?)',
            [recipient.id, amount, amount],
            (err) => { if (err) reject(err); else resolve(); }
          );
        } else {
          db.run(
            'UPDATE users SET nfx = nfx + ?, taken = taken + ? WHERE user_id = ?',
            [amount, amount, recipient.id],
            (err) => { if (err) reject(err); else resolve(); }
          );
        }
      });

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username} Gave ₣!`)
        .setDescription(`${message.author} gave ${amount} ₣ to ${recipient}!`)
        .setColor(getRandomColor())
        .setThumbnail(await renderCoinStack(amount))
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
      console.error('nfxgive error:', error);
    }
  }
};