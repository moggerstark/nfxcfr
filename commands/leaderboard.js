const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../utils/database');
const { getRandomColor } = require('../utils/colors');
const { getRandomGif } = require('../utils/gifs');
const { renderLeaderboard } = require('../utils/animations');

// Leaderboard command: Shows top 10 users by nfxcash, live updates every 10s
module.exports = {
  name: 'leaderboard',
  aliases: ['lb'],
  async execute(message, args, client) {
    try {
      const serverId = message.guild.id;
      const db = getDb(serverId);
      // Fetch leaderboard channel from settings
      const settings = await new Promise((resolve, reject) => {
        db.get(
          'SELECT leaderboard_channel FROM settings WHERE server_id = ?',
          [serverId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // Check if leaderboard channel is set
      if (!settings?.leaderboard_channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username}, Oops!`)
          .setDescription('Leaderboard channel not set! Ask an admin to use `!setliveleaderboard`.')
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setFooter({ text: 'Developed by Moggerstark' });
        await message.channel.send({ embeds: [embed] });
        db.close();
        return;
      }

      // Fetch top 10 users by nfxcash
      const users = await new Promise((resolve, reject) => {
        db.all(
          'SELECT user_id, nfx FROM users ORDER BY nfx DESC LIMIT 10',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Get usernames for leaderboard
      const leaderboardUsers = await Promise.all(users.map(async user => {
        const member = await message.guild.members.fetch(user.user_id).catch(() => null);
        return {
          username: member ? member.user.username : 'Unknown User',
          nfx: user.nfx
        };
      }));

      // Initial leaderboard embed
      const embed = new EmbedBuilder()
        .setTitle('nfxcash Leaderboard')
        .setDescription('Top 10 users by nfxcash! Updates every 10 seconds.')
        .setColor(getRandomColor())
        .setImage('attachment://leaderboard.png')
        .setThumbnail(await getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' });
      const leaderboardImage = await renderLeaderboard(leaderboardUsers);
      const msg = await client.channels.cache.get(settings.leaderboard_channel)
        .send({ embeds: [embed], files: [{ attachment: leaderboardImage, name: 'leaderboard.png' }] });

      // Live updates every 10 seconds
      const interval = setInterval(async () => {
        try {
          const updatedUsers = await new Promise((resolve, reject) => {
            db.all(
              'SELECT user_id, nfx FROM users ORDER BY nfx DESC LIMIT 10',
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              }
            );
          });
          const updatedLeaderboardUsers = await Promise.all(updatedUsers.map(async user => {
            const member = await message.guild.members.fetch(user.user_id).catch(() => null);
            return {
              username: member ? member.user.username : 'Unknown User',
              nfx: user.nfx
            };
          }));
          const updatedImage = await renderLeaderboard(updatedLeaderboardUsers);
          embed.setColor(getRandomColor())
            .setThumbnail(await getRandomGif());
          await msg.edit({ embeds: [embed], files: [{ attachment: updatedImage, name: 'leaderboard.png' }] });
        } catch (error) {
          console.error('Leaderboard update error:', error);
          clearInterval(interval);
        }
      }, 10000);

      // Stop updates if bot is disconnected
      client.on('disconnect', () => clearInterval(interval));

      db.close();
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}, Error!`)
        .setDescription(`Something went wrong: ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('Leaderboard error:', error);
    }
  }
};