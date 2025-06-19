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
  name: 'spin',
  aliases: ['s'],
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

      // Spin animation
      const animationMsg = await message.channel.send(`<@${userId}> 🎡 Spinning the wheel...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await animationMsg.edit(`<@${userId}> 🎰 Almost there...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await animationMsg.delete();

      // Spin logic
      const rewards = [0, amount * 2, amount * 3, amount / 2, amount * 5];
      const probabilities = [0.4, 0.3, 0.15, 0.1, 0.05];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      const rewardIndex = rewards.indexOf(reward);
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
            'UPDATE users SET nfx = nfx + ?, total_earned = total_earned + ?, spin_wins = spin_wins + 1 WHERE user_id = ?',
            [reward, reward, userId],
            err => err ? reject(err) : resolve()
          );
        });
      }

      // Update quest
      if (amount >= 100) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET weekly_spins_progress = weekly_spins_progress + 1 WHERE user_id = ?',
            [userId],
            err => err ? reject(err) : resolve()
          );
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(won ? '🎉 Wheel Spin Win!' : '😢 Wheel Spin Loss!')
        .setDescription([
          '🎡 You spun the wheel!',
          `It landed on a ${reward === 0 ? 'loss' : `x${rewards[rewardIndex] / amount} multiplier`}!`,
          won ? `You won **${reward} ₣**!` : `You lost **${amount} ₣**!`
        ].join('\n'))
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setThumbnail(gifUrl)
        .setFooter({ text: 'Developed by Moggerstark 🐾' })
        .setTimestamp();

      await message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

    } catch (error) {
      console.error('Spin error:', error);
      await message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! 💥**`)
        .setDescription(`⚠️ Error in spinning: ${error.message}!`)
        .setColor(0xff0000)
        .setThumbnail(getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark 🐾' })] });
    }
  }
};