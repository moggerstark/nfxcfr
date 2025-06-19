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
  name: 'bet',
  aliases: ['b'],
  cooldown: 0.5,
  async execute(message, args, client) {
    try {
      const serverId = message.guild.id.toString();
      const userId = message.author.id.toString();
      const amount = parseInt(args[0]);
      const choice = args[1]?.toLowerCase();
      const gifUrl = getRandomGif();

      if (isNaN(amount) || amount <= 0) {
        return message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Error! 💥**`)
          .setDescription('🚫 Amount must be greater than 0!')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark' })] });
      }

      if (choice && !['h', 't'].includes(choice)) {
        return message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Error! 💥**`)
          .setDescription('🚫 Choice must be "h" (heads) or "t" (tails)!')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark' })] });
      }

      // Check betting channel
      const settings = await new Promise((resolve, reject) => {
        db.get('SELECT betting_channel_id FROM server_settings WHERE server_id = ?', [serverId], (err, row) => {
          err ? reject(err) : resolve(row);
        });
      });

      if (!settings || !settings.betting_channel_id) {
        return message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Error! 💥**`)
          .setDescription('🚫 Betting channel not set! Ask admin to use !setbettingchannel.')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark' })] });
      }

      if (message.channel.id.toString() !== settings.betting_channel_id) {
        const bettingChannel = message.guild.channels.cache.get(settings.betting_channel_id);
        return message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Error! 💥**`)
          .setDescription(`🚫 This command only works in ${bettingChannel ? bettingChannel.toString() : 'betting channel'}!`)
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark' })] });
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
          .setFooter({ text: 'Developed by Moggerstark' })] });
      }

      // Coin flip animation
      const animationMsg = await message.channel.send(`<@${userId}> 🪙 Flipping the coin...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await animationMsg.edit(`<@${userId}> 🪙 Spinning...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await animationMsg.delete();

      // Coin flip logic
      const userChoice = choice || ['h', 't'][Math.floor(Math.random() * 2)];
      const result = ['h', 't'][Math.floor(Math.random() * 2)];

      // Win probability and multiplier
      let winProbability, multiplier;
      if (amount < 500) {
        winProbability = 0.7;
        multiplier = 2;
      } else if (amount <= 1000) {
        winProbability = 0.4;
        multiplier = 1.5;
      } else {
        winProbability = 0.2;
        multiplier = 1.2;
      }

      const won = Math.random() < winProbability ? result === userChoice : result !== userChoice;
      let resultMsg, netWinnings;

      if (won) {
        netWinnings = Math.round(amount * (multiplier - 1));
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET nfx = nfx - ? + ?, total_earned = total_earned + ?, bet_wins = bet_wins + 1 WHERE user_id = ?',
            [amount, amount * multiplier, netWinnings, userId],
            err => err ? reject(err) : resolve()
          );
        });
        resultMsg = [
          '🪙 You flipped a coin!',
          `It landed on **${result === 'h' ? 'heads' : 'tails'}**, you chose **${userChoice === 'h' ? 'heads' : 'tails'}**!`,
          `🌟 You won **${amount * multiplier} ₣**, net gain **${netWinnings} ₣**!`
        ].join('\n');
      } else {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET nfx = nfx - ?, bet_losses = bet_losses + 1 WHERE user_id = ?',
            [amount, userId],
            err => err ? reject(err) : resolve()
          );
        });
        resultMsg = [
          '🪙 You flipped a coin!',
          `It landed on **${result === 'h' ? 'heads' : 'tails'}**, you chose **${userChoice === 'h' ? 'heads' : 'tails'}**!`,
          `😢 You lost **${amount} ₣**!`
        ].join('\n');
      }

      // Update quests
      if (amount >= 50) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET daily_bet_progress = daily_bet_progress + ? WHERE user_id = ?',
            [amount, userId],
            err => err ? reject(err) : resolve()
          );
        });
      }
      if (amount >= 500) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET mega_bet_progress = mega_bet_progress + ? WHERE user_id = ?',
            [amount, userId],
            err => err ? reject(err) : resolve()
          );
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(won ? '🌟 Coinflip Win!' : '😢 Coinflip Loss!')
        .setDescription(resultMsg)
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setThumbnail(gifUrl)
        .setFooter({ text: 'Developed by Moggerstark 🐾' })
        .setTimestamp();

      await message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

    } catch (error) {
      console.error('Bet error:', error);
      await message.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! 💥**`)
        .setDescription(`⚠️ Error in betting: ${error.message}!`)
        .setColor(0xff0000)
        .setThumbnail(getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' })] });
    }
  }
};