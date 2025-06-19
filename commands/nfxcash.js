const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel
} = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const getRandomColor = () => [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF][Math.floor(Math.random() * 6)];
const gifs = [
  "https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  ...Array(78).fill("https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif")
];
const getRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

module.exports = {
  name: 'nfxcash',
  aliases: ['nc'],
  async execute(message, args, client) {
    try {
      const db = client.db;
      const serverId = message.guild.id;

      // Fetch user stats
      const userStats = await new Promise((resolve, reject) => {
        db.get('SELECT nfx, total_earned, given, taken, wins, losses, invites, messages, voice_minutes FROM users WHERE user_id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(row || { nfx: 0, total_earned: 0, given: 0, taken: 0, wins: 0, losses: 0, invites: 0, messages: 0, voice_minutes: 0 });
        });
      });
      const pokemonCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM caught_pokemon WHERE user_id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(row?.count || 0);
        });
      });
      const shopItems = await new Promise((resolve, reject) => {
        db.all('SELECT item, price FROM shop', (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        });
      });

      // Dynamic embed
      let embed = new EmbedBuilder()
        .setTitle(`💰 **${message.author.username}'s nfxcash** 💰`)
        .setDescription(
          `**💸 Current ₣**: ${userStats.nfx.toFixed(2)}\n` +
          `**💰 Total Earned**: ${userStats.total_earned.toFixed(2)} ₣\n` +
          `**🎁 Given**: ${userStats.given.toFixed(2)} ₣\n` +
          `**💸 Taken**: ${userStats.taken.toFixed(2)} ₣\n` +
          `**🐾 Pokémon**: ${pokemonCount}\n` +
          `**🏆 Wins (Bet/Spin/Slot)**: ${userStats.wins}\n` +
          `**💥 Losses**: ${userStats.losses}\n` +
          `**📩 Invites**: ${userStats.invites} (**💸 ${userStats.invites * 100} ₣**)\n` +
          `**📝 Messages**: ${userStats.messages} (**💸 ${userStats.messages} ₣**)\n` +
          `**🎙️ Voice Minutes**: ${userStats.voice_minutes} (**💸 ${userStats.voice_minutes * 2} ₣**)`
        )
        .setColor(getRandomColor())
        .setThumbnail(getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' });

      const msg = await message.channel.send({ embeds: [embed] });
      const embedInterval = setInterval(() => {
        embed.setColor(getRandomColor()).setThumbnail(getRandomGif());
        msg.edit({ embeds: [embed] }).catch(console.error);
      }, 5000);

      const itemsPerPage = 5;
      let currentPage = 0;
      const totalPages = Math.ceil(shopItems.length / itemsPerPage);

      const updateShopSelect = () => {
        const start = currentPage * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = shopItems.slice(start, end);
        return new StringSelectMenuBuilder()
          .setCustomId('shop_select')
          .setPlaceholder(`📦 Page ${currentPage + 1} of ${totalPages}`)
          .addOptions(pageItems.map(item => ({
            label: `💎 ${item.item} - ${item.price} ₣`,
            value: item.item
          })));
      };

      const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️ Previous').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
        new ButtonBuilder().setCustomId('next_page').setLabel('➡️ Next').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1)
      );

      const shopSelect = updateShopSelect();
      const row = new ActionRowBuilder().addComponents(shopSelect);
      const components = [row];
      if (shopItems.length > itemsPerPage) components.push(navigationRow);

      await msg.edit({ components });

      if (shopItems.length) {
        const collector = msg.createMessageComponentCollector({ time: 60000 });
        let shopSelectRef = shopSelect;
        collector.on('collect', async interaction => {
          if (interaction.user.id !== message.author.id) {
            await interaction.reply({ content: '❌ Not your shop!', ephemeral: true });
            return;
          }
          if (interaction.customId === 'prev_page' || interaction.customId === 'next_page') {
            await interaction.deferUpdate();
            if (interaction.customId === 'prev_page' && currentPage > 0) currentPage--;
            if (interaction.customId === 'next_page' && currentPage < totalPages - 1) currentPage++;
            shopSelectRef = updateShopSelect();
            const newRow = new ActionRowBuilder().addComponents(shopSelectRef);
            const newNavigationRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️ Previous').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
              new ButtonBuilder().setCustomId('next_page').setLabel('➡️ Next').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1)
            );
            await interaction.message.edit({ components: [newRow, newNavigationRow] });
            return;
          }
          await interaction.deferUpdate();
          const item = shopItems.find(i => i.item === interaction.values[0]);
          if (!item) {
            await interaction.followUp({ content: '❌ Item not found!', ephemeral: true });
            return;
          }
          if (userStats.nfx < item.price) {
            await interaction.followUp({ content: '❌ Insufficient ₣!', ephemeral: true });
            return;
          }

          await new Promise((resolve, reject) => db.run('UPDATE users SET nfx = nfx - ? WHERE user_id = ?', [item.price, message.author.id], err => (err ? reject(err) : resolve())));

          const ticketCategory = (await new Promise((resolve, reject) => db.get('SELECT ticket_category FROM settings WHERE server_id = ?', [serverId], (err, row) => (err ? reject(err) : resolve(row?.ticket_category))))) || null;
          const ticketStaffRole = (await new Promise((resolve, reject) => db.get('SELECT ticket_staff_role FROM settings WHERE server_id = ?', [serverId], (err, row) => (err ? reject(err) : resolve(row?.ticket_staff_role))))) || null;
          const ticketRole = (await new Promise((resolve, reject) => db.get('SELECT ticket_role FROM settings WHERE server_id = ?', [serverId], (err, row) => (err ? reject(err) : resolve(row?.ticket_role))))) || null;

          const ticketChannel = await message.guild.channels.create({
            name: `🎟️ ticket-${message.author.username}-${Date.now()}`,
            type: 0,
            parent: ticketCategory,
            permissionOverwrites: [
              { id: message.author.id, allow: ['ViewChannel', 'SendMessages'] },
              { id: message.guild.roles.everyone, deny: ['ViewChannel'] },
              ...(ticketStaffRole ? [{ id: ticketStaffRole, allow: ['ViewChannel', 'SendMessages', 'ManageChannels'] }] : [])
            ]
          }).catch(err => console.error('Channel error:', err));

          if (!ticketChannel) {
            await interaction.followUp({ content: '❌ Failed to create ticket!', ephemeral: true });
            return;
          }

          if (ticketRole) {
            const member = await message.guild.members.fetch(message.author.id);
            await member.roles.add(ticketRole).catch(console.error);
          }

          const purchaseEmbed = new EmbedBuilder()
            .setTitle('🎉 **Purchase Success**')
            .setDescription(`**👤 Purchased by:** <@${message.author.id}>\n**💎 Item:** ${item.item}\n**💰 Price:** ${item.price} ₣\n**💸 New Balance:** ${(userStats.nfx - item.price).toFixed(2)} ₣\nThank you! 🎁`)
            .setColor(getRandomColor())
            .setThumbnail(getRandomGif())
            .setFooter({ text: 'Developed by Moggerstark' });

          const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('✅ Close & Delete').setStyle(ButtonStyle.Danger).setDisabled(!ticketStaffRole || !message.member.roles.cache.has(ticketStaffRole))
          );

          await ticketChannel.send({ embeds: [purchaseEmbed], components: [buttonRow] });

          shopSelectRef.setDisabled(true);
          await msg.edit({ components: [row] });

          const ticketCollector = ticketChannel.createMessageComponentCollector({ time: 3600000 });
          ticketCollector.on('collect', async interaction => {
            if (!ticketStaffRole || !interaction.member.roles.cache.has(ticketStaffRole)) {
              await interaction.reply({ content: '❌ Only staff can manage!', ephemeral: true });
              return;
            }
            try {
              const logChannelId = (await new Promise((resolve, reject) => db.get('SELECT log_channel FROM settings WHERE server_id = ?', [serverId], (err, row) => (err ? reject(err) : resolve(row?.log_channel))))) || null;
              if (logChannelId) {
                const logChannel = client.channels.cache.get(logChannelId);
                if (logChannel) {
                  const transcript = `🎫 Ticket closed by ${interaction.user.tag} at ${new Date().toISOString()}\n📌 Channel: ${ticketChannel.name}\n👤 User: ${message.author.tag}`;
                  await logChannel.send({ content: transcript });
                }
              }
              const userId = ticketChannel.topic || message.author.id;
              const member = await message.guild.members.fetch(userId).catch(() => null);
              if (member && ticketRole) await member.roles.remove(ticketRole).catch(console.error);
              await ticketChannel.delete();
              await interaction.update({ content: '✅ Ticket closed and deleted!', components: [] });
            } catch (err) {
              console.error('Ticket error:', err);
              await interaction.reply({ content: '❌ Failed to manage!', ephemeral: true });
            }
          });

          ticketCollector.on('end', () => {
            if (!ticketChannel.deleted) {
              ticketChannel.permissionOverwrites.edit(message.author.id, { SendMessages: false }).catch(console.error);
            }
          });
        });

        collector.on('end', async () => {
          shopSelectRef.setDisabled(true);
          clearInterval(embedInterval);
          await msg.edit({ components: [row] });
        });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error!**`)
        .setDescription(`❌ ${error.message}\nUse \`!nfxcash\` again.`)
        .setColor(0xff0000)
        .setThumbnail(getRandomGif())
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('nfxcash error:', error);
    }
  }
};