const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db', (err) => {
  if (err) console.error('Database connection error:', err);
});

const gifs = [
  "https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  // Add your 80 GIF URLs here
  // Placeholder for brevity
  ...Array(78).fill("https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif")
];

module.exports = {
  name: 'pokedex',
  aliases: ['pd'],
  cooldown: 5,
  async execute(message, args, client) {
    const userId = message.author.id;
    const categories = ['normal', 'rare', 'legendary', 'mythical', 'mega', 'three_stage'];
    let userCategory = 'normal';
    let page = 0;
    const itemsPerPage = 10;

    const updatePokedexEmbed = async () => {
      const query = userCategory === 'three_stage' ? 
        `SELECT name, rarity, is_gmax, hp, attack FROM pokemon WHERE is_three_stage = 1` :
        `SELECT name, rarity, is_gmax, hp, attack FROM pokemon WHERE rarity = ?`;
      const params = userCategory === 'three_stage' ? [] : [userCategory];
      const pokemon = await new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedPokemon = pokemon.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle(`Pokédex: ${userCategory.charAt(0).toUpperCase() + userCategory.slice(1)}`)
        .setDescription(pokemon.length ? `**Pokémon (${start + 1}-${Math.min(end, pokemon.length)}/${pokemon.length})**:\n${paginatedPokemon.map(p => `${p.is_gmax ? 'G-Max ' : ''}${p.name.charAt(0).toUpperCase() + p.name.slice(1)} (${p.rarity}, HP: ${p.hp}, Attack: ${p.attack})`).join('\n')}` : 'No Pokémon in this category!')
        .setColor(0x00ff00)
        .setThumbnail(gifs[Math.floor(Math.random() * gifs.length)]);

      const components = [];

      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('Select Category')
        .addOptions(categories.map(cat => ({
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          value: cat,
          emoji: cat === 'legendary' ? '⭐' : cat === 'mythical' ? '💎' : cat === 'mega' ? '⚡' : cat === 'rare' ? '🪨' : cat === 'three_stage' ? '🌿' : '⚪'
        })));
      components.push(new ActionRowBuilder().addComponents(categorySelect));

      if (pokemon.length > itemsPerPage) {
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(end >= pokemon.length)
        );
        components.push(buttons);
      }

      return { embed, components };
    };

    let msg = await message.channel.send({ embeds: [(await updatePokedexEmbed()).embed], components: (await updatePokedexEmbed()).components });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: 'This Pokédex is not for you!', ephemeral: true });
      }
      await interaction.deferUpdate();

      if (interaction.customId === 'category_select') {
        userCategory = interaction.values[0];
        page = 0;
      } else if (interaction.customId === 'prev_page' && page > 0) {
        page--;
      } else if (interaction.customId === 'next_page') {
        page++;
      }

      const update = await updatePokedexEmbed();
      await interaction.update({ embeds: [update.embed], components: update.components });
    });

    collector.on('end', () => {
      msg.edit({ components: [] });
    });
  }
};