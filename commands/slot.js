const { EmbedBuilder, ActionRowBuilder } = require('discord.js');
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
  name: 'slot',
  aliases: ['slots', 'sl'],
  cooldown: 0.5,
  async execute(message, args, client) {
    try {
      const serverId = message.guild.id.toString();
      const userId = message.author.id.toString();
      const amount = parseInt(args[0]);
      const gifUrl = getRandomGif();

      if (isNaN(amount) || amount <= 0) {
        return message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Error! 💥**`)
          .setDescription('🚫 Amount must be greater than 0!')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark 🐾' })] });
      }

      // Check user NFX cash
      const userData = await new Promise((resolve, reject) => {
        db.get('SELECT nfx FROM users WHERE user_id = ?', [userId], (err, row) => {
          err ? reject(err) : resolve(row);
        });
      });

      if (!userData || userData.nfx < amount) {
        return message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Error! 💥**`)
          .setDescription('🚫 Not enough NFX cash!')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark 🐾' })] });
      }

      // Slot animation
      const animationMsg = await message.channel.send(`<@${userId}> 🎰 Spinning the slots...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await animationMsg.edit(`<@${userId}> 🔄 Reels rolling...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await animationMsg.delete();

      // Slot logic
      const symbols = ['🍒', '💎', '🍋', '7️⃣'];
      const reels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];

      const tripleMatch = reels[0] === reels[1] && reels[1] === reels[2];
      const doubleMatch = (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) && !tripleMatch;
      let reward = 0, multiplier = 0, resultMsg;

      if (tripleMatch) {
        multiplier = 3; // x3 for triple match
        reward = amount * multiplier;
      } else if (doubleMatch) {
        multiplier = 1.5; // x1.5 for double match
        reward = amount * multiplier;
      } else {
        multiplier = 0; // Loss
        reward = 0;
      }

      const won = reward > 0;

      // Update NFX cash
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET nfx = nfx - ? WHERE user_id = ?',
          [amount, userId],
          err => err ? reject(err) : resolve()
        );
      });

      if (won) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET nfx = nfx + ?, total_earned = total_earned + ?, slot_wins = slot_wins + 1 WHERE user_id = ?',
            [reward, reward, userId],
            err => err ? reject(err) : resolve()
          );
        });
      }

      // Update quest
      if (amount >= 100) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET weekly_slots_progress = weekly_slots_progress + 1 WHERE user_id = ?',
            [userId],
            err => err ? reject(err) : resolve()
          );
        });
      }

      resultMsg = [
        '🎰 You spun the slot machine!',
        `You got **${reels.join(' | ')}**!`,
        won ? `You won **${reward} ₣**!` : `You lost **${amount} ₣**!`
      ].join('\n');

      const embed = new EmbedBuilder()
        .setTitle(won ? '🎉 Slot Machine Win!' : '😢 Slot Machine Loss!')
        .setDescription(resultMsg)
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setThumbnail(gifUrl)
        .setFooter({ text: 'Developed by Moggerstark 🐾' })
        .setTimestamp();

      await message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

    } catch (error) {
      console.error('Slot error:', error);
      await message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! 💥**`)
        .setDescription(`⚠️ Error in slots: ${error.message}!`)
        .setColor(0xff0000)
        .setThumbnail(getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark 🐾' })] });
    }
  }
};