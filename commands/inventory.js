const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Hardcode database path to guild.db
const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db', (err) => {
  if (err) console.error('Database connection error:', err);
});

// Placeholder for getRandomColor
const getRandomColor = () => {
  const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Your 80 GIFs (replace with your actual URLs)
const gifs = [
  "https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  // Add your 80 GIF URLs here
  // Placeholder for brevity
  ...Array(78).fill("https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif")
];

// Placeholder for getRandomGif
const getRandomGif = async () => {
  return gifs[Math.floor(Math.random() * gifs.length)];
};

const pokemonIdCache = new Map();
async function getPokemonSprite(pokemonName, isShiny = false, isGmax = false) {
  if (typeof pokemonName !== 'string') {
    console.error('Invalid pokemonName:', pokemonName);
    pokemonName = 'bulbasaur';
  }
  const cacheKey = `${pokemonName}_${isShiny}_${isGmax}`;
  if (!pokemonIdCache.has(cacheKey)) {
    const pokemon = await new Promise((resolve, reject) => {
      db.get('SELECT id, shiny_sprite, gmax_sprite, is_gmax FROM pokemon WHERE name = ?', [pokemonName], (err, row) => {
        if (err) reject(err);
        else resolve(row || { id: 1, shiny_sprite: null, gmax_sprite: null, is_gmax: 0 });
      });
    });
    const sprite = isGmax && pokemon.is_gmax && pokemon.gmax_sprite ? pokemon.gmax_sprite :
                   isShiny && pokemon.shiny_sprite ? pokemon.shiny_sprite :
                   `https://play.pokemonshowdown.com/sprites/ani/${pokemonName}.gif` || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id || 1}.png`;
    pokemonIdCache.set(cacheKey, sprite);
  }
  return pokemonIdCache.get(cacheKey);
}

module.exports = {
  name: 'inventory',
  aliases: ['inv'],
  cooldown: 3,
  async execute(message, args, client) {
    const userId = message.author.id;

    try {
      let gifUrl = 'https://example.com/default-thumbnail.png';
      try { gifUrl = await getRandomGif(); } catch (e) { console.error('GIF fetch error:', e); }

      const userPokemon = await new Promise((resolve, reject) => {
        db.all('SELECT pokemon_name, rarity, is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ?', [userId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      if (!userPokemon.length) {
        return message.channel.send({ embeds: [new EmbedBuilder()
          .setTitle(`✨ ${message.author.username}'s Inventory`)
          .setDescription('**Empty!** Catch Pokémon with `!hunt`.')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark 🐾' })] });
      }

      // Get random Pokémon sprite for hero image
      const randomPokemon = userPokemon[Math.floor(Math.random() * userPokemon.length)];
      const heroSprite = await getPokemonSprite(randomPokemon.pokemon_name, randomPokemon.is_shiny, randomPokemon.is_gmax);

      const categories = ['normal', 'rare', 'legendary', 'mythical', 'mega', 'three_stage', 'shiny', 'gmax'];
      let currentCategory = 'normal';
      let dropdownPage = 0;
      let selectedPokemon = null;

      const fetchPokemon = async (userId, category) => {
        let query, params;
        if (category === 'three_stage') {
          query = `SELECT pokemon_name, rarity, is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ? AND pokemon_name IN (SELECT name FROM pokemon WHERE is_three_stage = 1)`;
          params = [userId];
        } else if (category === 'shiny') {
          query = `SELECT pokemon_name, rarity, is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ? AND is_shiny = 1`;
          params = [userId];
        } else if (category === 'gmax') {
          query = `SELECT pokemon_name, rarity, is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ? AND is_gmax = 1`;
          params = [userId];
        } else {
          query = `SELECT pokemon_name, rarity, is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ? AND pokemon_name IN (SELECT name FROM pokemon WHERE rarity = ?)`;
          params = [userId, category];
        }
        return await new Promise((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      };

      const updateInventoryEmbed = async () => {
        const pokemon = await fetchPokemon(userId, currentCategory);
        const categoryEmoji = currentCategory === 'legendary' ? '⭐' : currentCategory === 'mythical' ? '💎' : currentCategory === 'mega' ? '⚡' : currentCategory === 'rare' ? '🪨' : currentCategory === 'three_stage' ? '🌿' : currentCategory === 'shiny' ? '🌟' : currentCategory === 'gmax' ? '⚡' : '⚪';
        const embed = new EmbedBuilder()
          .setTitle(`${categoryEmoji} ${message.author.username}'s Pokémon`)
          .setColor(currentCategory === 'legendary' ? 0xFFD700 : currentCategory === 'mythical' ? 0xFF69B4 : currentCategory === 'mega' ? 0xFF4500 : currentCategory === 'rare' ? 0x1E90FF : currentCategory === 'three_stage' ? 0x228B22 : currentCategory === 'shiny' ? 0xC0C0C0 : currentCategory === 'gmax' ? 0xFF8C00 : 0x808080)
          .setThumbnail(gifUrl)
          .setFooter({ text: `Developed by Moggerstark 🐾` });

        if (selectedPokemon) {
          const sprite = await getPokemonSprite(selectedPokemon.name, selectedPokemon.is_shiny, selectedPokemon.is_gmax);
          embed.setTitle(`${selectedPokemon.is_shiny ? '🌟 ' : selectedPokemon.is_gmax ? '⚡ ' : ''}${selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1)}`)
            .setDescription(`**Type**: ${selectedPokemon.type2 ? `${selectedPokemon.type1 || 'Unknown'}, ${selectedPokemon.type2}` : selectedPokemon.type1 || 'Unknown'}\n**HP**: ${selectedPokemon.hp || 'N/A'}\n**Attack**: ${selectedPokemon.attack || 'N/A'}\n**Defence**: ${selectedPokemon.defense || 'N/A'}\n**Rarity**: ${selectedPokemon.rarity || 'Unknown'}`)
            .setImage(sprite);
        } else {
          embed.setDescription('Pick a Pokémon to view details! ✨')
            .setImage(heroSprite);
        }

        let components = [];
        const categorySelect = new StringSelectMenuBuilder()
          .setCustomId('category_select')
          .setPlaceholder('Select Category 📋')
          .addOptions(categories.map(cat => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            value: cat,
            emoji: cat === 'legendary' ? '⭐' : cat === 'mythical' ? '💎' : cat === 'mega' ? '⚡' : cat === 'rare' ? '🪨' : cat === 'three_stage' ? '🌿' : cat === 'shiny' ? '🌟' : cat === 'gmax' ? '⚡' : '⚪'
          })));
        components.push(new ActionRowBuilder().addComponents(categorySelect));

        if (!pokemon.length && !selectedPokemon) {
          embed.setDescription(`No Pokémon in **${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}**! Try \`!hunt\`.`);
          return { embed, components, total: 0 };
        }

        const uniquePokemonNames = [...new Set(pokemon.map(p => p.pokemon_name))];
        const validOptions = uniquePokemonNames
          .map(name => {
            const p = pokemon.find(p => p.pokemon_name === name);
            return {
              label: `${currentCategory === 'shiny' ? '🌟 ' : currentCategory === 'gmax' ? '⚡ ' : ''}${p.pokemon_name} (${p.rarity || 'Unknown'})`,
              value: p.pokemon_name
            };
          });

        const totalPages = Math.ceil(validOptions.length / 25);
        const start = dropdownPage * 25;
        const end = start + 25;
        const pageOptions = validOptions.slice(start, end);

        if (pageOptions.length > 0) {
          const select = new StringSelectMenuBuilder()
            .setCustomId('pokemon_select')
            .setPlaceholder(`Select Pokémon ✨ (Page ${dropdownPage + 1}/${totalPages})`)
            .addOptions(pageOptions);
          components.push(new ActionRowBuilder().addComponents(select));

          const prevButton = new ButtonBuilder()
            .setCustomId('prev_dropdown')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(dropdownPage === 0);
          const nextButton = new ButtonBuilder()
            .setCustomId('next_dropdown')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(dropdownPage >= totalPages - 1);
          components.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
        }

        embed.setFooter({ text: `Page ${dropdownPage + 1}/${totalPages} • ${uniquePokemonNames.length} Pokémon • Developed by Moggerstark 🐾` });
        return { embed, components, total: uniquePokemonNames.length };
      };

      let msg = await message.channel.send({ embeds: [(await updateInventoryEmbed()).embed], components: (await updateInventoryEmbed()).components });
      // Animated welcome
      const welcomeEmbed = (await updateInventoryEmbed()).embed;
      welcomeEmbed.setDescription('✨ Pick a Pokémon to view details!');
      await msg.edit({ embeds: [welcomeEmbed], components: (await updateInventoryEmbed()).components });
      await new Promise(resolve => setTimeout(resolve, 500));
      welcomeEmbed.setDescription('Pick a Pokémon to view details! ✨');
      await msg.edit({ embeds: [welcomeEmbed], components: (await updateInventoryEmbed()).components });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
          try {
            await interaction.followUp({ content: 'This isn\'t your inventory! 🚫', flags: 64 });
          } catch (e) { console.error('FollowUp failed:', e); }
          return;
        }
        try {
          await interaction.deferUpdate();
        } catch (e) {
          console.error('Defer update failed:', e);
          return;
        }

        if (interaction.customId === 'category_select') {
          currentCategory = interaction.values[0];
          dropdownPage = 0;
          selectedPokemon = null; // Reset selection on category change
          const update = await updateInventoryEmbed();
          await interaction.editReply({ embeds: [update.embed], components: update.components });
        } else if (interaction.customId === 'prev_dropdown') {
          dropdownPage = Math.max(0, dropdownPage - 1);
          const update = await updateInventoryEmbed();
          await interaction.editReply({ embeds: [update.embed], components: update.components });
        } else if (interaction.customId === 'next_dropdown') {
          const pokemon = await fetchPokemon(userId, currentCategory);
          const uniquePokemonNames = [...new Set(pokemon.map(p => p.pokemon_name))];
          const totalPages = Math.ceil(uniquePokemonNames.length / 25);
          dropdownPage = Math.min(totalPages - 1, dropdownPage + 1);
          const update = await updateInventoryEmbed();
          await interaction.editReply({ embeds: [update.embed], components: update.components });
        } else if (interaction.customId === 'pokemon_select') {
          const pokemonName = interaction.values[0];
          const pokemon = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM pokemon WHERE name = ?', [pokemonName], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          const caught = await new Promise((resolve, reject) => {
            db.get('SELECT is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ? AND pokemon_name = ?', [userId, pokemonName], (err, row) => {
              if (err) reject(err);
              else resolve(row || { is_shiny: 0, is_gmax: 0 });
            });
          });
          if (pokemon) {
            selectedPokemon = {
              name: pokemonName,
              type1: pokemon.type1,
              type2: pokemon.type2,
              hp: pokemon.hp,
              attack: pokemon.attack,
              defense: pokemon.defense,
              rarity: pokemon.rarity,
              is_shiny: caught.is_shiny,
              is_gmax: caught.is_gmax
            };
            let update = await updateInventoryEmbed();
            await interaction.editReply({ embeds: [update.embed], components: update.components });

            // Shake animation (edit same message)
            await new Promise(resolve => setTimeout(resolve, 500));
            update.embed.setTitle(`🌟 ${update.embed.data.title.replace(/^[🌟⚡✅]\s/, '')}`);
            await msg.edit({ embeds: [update.embed], components: update.components });
            await new Promise(resolve => setTimeout(resolve, 500));
            update.embed.setTitle(`⚡ ${update.embed.data.title.replace('🌟 ', '')}`);
            await msg.edit({ embeds: [update.embed], components: update.components });
            await new Promise(resolve => setTimeout(resolve, 500));
            update.embed.setTitle(`✅ ${update.embed.data.title.replace('⚡ ', '')}`);
            await msg.edit({ embeds: [update.embed], components: update.components });
          }
        }
      });

      collector.on('end', async () => {
        const update = await updateInventoryEmbed();
        update.components.forEach(row => row.components.forEach(comp => comp.setDisabled(true)));
        await msg.edit({ components: update.components });
      });
    } catch (error) {
      console.error('Inventory error:', error);
      await message.channel.send({ embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! 🎒**`)
        .setDescription(`Something went wrong: ${error.message}`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' })] });
    }
  }
};