const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getRandomColor } = require('../utils/colors');
const { getRandomGif } = require('../utils/gifs');

module.exports = {
  name: 'help',
  aliases: ['h'],
  async execute(message, args, client) {
    try {
      const categories = {
        pokemon: ['hunt (h)', 'inventory (inv)', 'battle (b)', 'pvp (pv)', 'pokedex (pd)'],
        economy: ['nfxcash (nc)', 'nfxdaily (ndaily)', 'nfxgive (ng)', 'nfxpray (np)', 'stats (st)'],
        games: ['bet (b)', 'spin (sp)', 'slot (sl)'],
        quests: ['quest (q)'],
        admin: ['setliveleaderboard', 'addcash', 'shopadd', 'shopremove', 'settc', 'settrstaff', 'settr', 'tclose', 'setlogchannel', 'addnfx', 'removenfx', 'resetnfx', 'resetserver', 'setmsgchannel', 'setbotchannel', 'ping']
      };

      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('🎯 Select Category')
        .addOptions(Object.keys(categories).map(cat => ({
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          value: cat
        })));

      const row = new ActionRowBuilder().addComponents(categorySelect);
      const embed = new EmbedBuilder()
        .setTitle(`📚 Help Requested by ${message.author.username}`)
        .setDescription(
          '**Categories**:\n' +
          Object.keys(categories).map(cat => `• ${cat.charAt(0).toUpperCase() + cat.slice(1)}`).join('\n') +
          '\n\n🎮 Select a category to explore commands!'
        )
        .setColor(getRandomColor())
        .setThumbnail(await getRandomGif())
        .setImage('https://media.giphy.com/media/LXq1wv7cKX0xG/giphy.gif')
        .setFooter({ text: 'Developed by Moggerstark' });

      const msg = await message.channel.send({ embeds: [embed], components: [row] });

      const interval = setInterval(async () => {
        try {
          embed.setColor(getRandomColor()).setThumbnail(await getRandomGif());
          await msg.edit({ embeds: [embed] });
        } catch (error) {
          clearInterval(interval);
        }
      }, 5000);

      const collector = msg.createMessageComponentCollector({ time: 180000 });
      collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
          await interaction.reply({ content: '❌ This is not your menu!', ephemeral: true });
          return;
        }
        await interaction.deferUpdate();
        clearInterval(interval);
        const category = interaction.values[0];
        embed.setTitle(`📋 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
          .setDescription(`**Commands**:\n${categories[category].map(cmd => `\`!${cmd}\``).join('\n')}`)
          .setColor(getRandomColor())
          .setThumbnail(await getRandomGif())
          .setImage('https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif');
        await interaction.message.edit({ embeds: [embed], components: [row] });
      });

      collector.on('end', async () => {
        clearInterval(interval);
        categorySelect.setDisabled(true);
        await msg.edit({ components: [row] });
      });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}, Error!`)
        .setDescription(`❌ ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' });
      await message.channel.send({ embeds: [embed] });
      console.error('Help error:', error);
    }
  }
};