const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const pokemonIdCache = new Map();

function getPokemonSprite(pokemon, isShiny = false, isGmax = false) {
  if (!pokemon) return 'https://play.pokemonshowdown.com/sprites/xy/1.png';
  const cacheKey = `${pokemon.name}_${isShiny}_${isGmax}`;
  if (!pokemonIdCache.has(cacheKey)) {
    let sprite = isGmax && pokemon.gmax_sprite ? pokemon.gmax_sprite :
                 isShiny && pokemon.shiny_sprite ? pokemon.shiny_sprite :
                 pokemon.animated_sprite || pokemon.sprite; // Fallback to static sprite
    pokemonIdCache.set(cacheKey, sprite || 'https://play.pokemonshowdown.com/sprites/xy/1.png'); // Default fallback
  }
  return pokemonIdCache.get(cacheKey);
}

function getRandomColor(type1 = 'normal', type2 = null) {
  const typeColors = {
    normal: [0xA8A878, 0xC0C0C0],
    fire: [0xF08030, 0xFF4500],
    water: [0x6890F0, 0x00CED1],
    grass: [0x78C850, 0x32CD32],
    electric: [0xF8D030, 0xFFD700],
    ice: [0x98D8D8, 0xADD8E6],
    fighting: [0xC03028, 0xDC143C],
    poison: [0xA040A0, 0x8A2BE2],
    ground: [0xE0C068, 0xDAA520],
    flying: [0xA890F0, 0x87CEEB],
    psychic: [0xF85888, 0xFF69B4],
    bug: [0xA8B820, 0x9ACD32],
    rock: [0xB8A038, 0xD2B48C],
    ghost: [0x705898, 0x6A5ACD],
    dragon: [0x7038F8, 0x4169E1],
    dark: [0x705848, 0x483D8B],
    steel: [0xB8B8D0, 0xC0C0C0],
    fairy: [0xEE99AC, 0xFFB6C1]
  };
  const colors = type2 ? [...typeColors[type1.toLowerCase() || 'normal'], ...typeColors[type2.toLowerCase() || 'normal']] : typeColors[type1.toLowerCase() || 'normal'];
  return colors[Math.floor(Math.random() * colors.length)] || 0x808080;
}

// Text-based phases instead of GIFs
const huntPhases = ['🌿 Searching...', '👁️ Encountering...', '🎯 Throwing Pokéball...'];
const successPhases = ['✅ Capturing...', '🌟 Secured!'];
const failPhases = ['😱 Struggling...', '💨 Escaping...'];

module.exports = {
  name: 'hunt',
  aliases: ['h'],
  cooldown: 1,
  async execute(message, args, client) {
    const userId = message.author.id;

    // Create a new database connection for this command
    const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db', sqlite3.OPEN_READWRITE, (err) => {
      if (err) console.error('Database connection error:', err);
    });

    try {
      let pokemon, isShiny = false, rarity, catchChance;
      const rand = Math.random();

      const queryWithRetry = async (query, params, retries = 5, delay = 200) => {
        for (let i = 0; i < retries; i++) {
          try {
            const result = await new Promise((resolve, reject) => {
              db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });
            console.log(`Query result for ${query} with params ${params}:`, result);
            return result || null;
          } catch (err) {
            if (err.code === 'SQLITE_BUSY' && i < retries - 1) {
              console.log(`Database busy, retrying (${i + 1}/${retries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw err;
          }
        }
        return null;
      };

      // Fetch Pokémon with adjusted chances (50% Normal, others reduced)
      let initialPokemon = null;
      if (rand < 0.50) { // Normal: 50%
        initialPokemon = await queryWithRetry('SELECT * FROM pokemon WHERE rarity = ? ORDER BY RANDOM() LIMIT 1', ['normal']);
        rarity = 'normal';
        catchChance = 0.20;
      } else if (rand < 0.60) { // Legendary: 10%
        initialPokemon = await queryWithRetry('SELECT * FROM pokemon WHERE rarity = ? ORDER BY RANDOM() LIMIT 1', ['legendary']);
        rarity = 'legendary';
        catchChance = 0.10;
      } else if (rand < 0.70) { // Mythical: 10%
        initialPokemon = await queryWithRetry('SELECT * FROM pokemon WHERE rarity = ? ORDER BY RANDOM() LIMIT 1', ['mythical']);
        rarity = 'mythical';
        catchChance = 0.10;
      } else if (rand < 0.80) { // Shiny: 10%
        initialPokemon = await queryWithRetry('SELECT * FROM pokemon WHERE shiny_sprite IS NOT NULL ORDER BY RANDOM() LIMIT 1', []);
        isShiny = true;
        rarity = initialPokemon ? initialPokemon.rarity || 'normal' : 'normal';
        catchChance = 0.15;
      } else if (rand < 0.90) { // GMax: 10%
        initialPokemon = await queryWithRetry('SELECT * FROM pokemon WHERE rarity = ? ORDER BY RANDOM() LIMIT 1', ['gmax']);
        if (initialPokemon) {
          pokemon = initialPokemon; // GMax as separate entity
          rarity = 'gmax';
          catchChance = 0.10;
        } else {
          initialPokemon = await queryWithRetry('SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 1', []);
          rarity = initialPokemon ? initialPokemon.rarity || 'normal' : 'normal';
          catchChance = 0.20;
        }
      } else { // Mega: 10%
        initialPokemon = await queryWithRetry('SELECT * FROM pokemon WHERE rarity = ? ORDER BY RANDOM() LIMIT 1', ['mega']);
        rarity = 'mega';
        catchChance = 0.10;
      }

      // Fallback to random Pokémon if initial query fails
      pokemon = initialPokemon || await queryWithRetry('SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 1', []);
      if (!pokemon) {
        return message.channel.send({ embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Oops! 🕵️‍♂️**`)
          .setDescription('No Pokémon found! Try again with `!hunt`.')
          .setColor(0xFF0000)
          .setFooter({ text: 'Developed by Moggerstark' })] })
          .finally(() => db.close());
      }

      // Enhanced UI with text-based animation
      const huntEmbed = new EmbedBuilder()
        .setTitle(`🕵️‍♂️ ${message.author.username}'s Epic Hunt!`)
        .setDescription(`${huntPhases[0]} [▮▮▮▮▮▮▮▮▮▮]`)
        .setColor(getRandomColor(pokemon.type1, pokemon.type2))
        .setFooter({ text: 'Developed by Moggerstark 🐾', iconURL: 'https://cdn.discordapp.com/emojis/1380017972437057586.png' });
      const huntMsg = await message.channel.send({ content: `<@${userId}>`, embeds: [huntEmbed] });

      await new Promise(resolve => setTimeout(resolve, 800));
      huntEmbed.setDescription(`${huntPhases[1]} [▮▮▮▮▮▮▮▮▮▮]`);
      await huntMsg.edit({ embeds: [huntEmbed] });

      await new Promise(resolve => setTimeout(resolve, 800));
      const pokemonName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
      const typeStr = pokemon.type2
        ? `${pokemon.type1}, ${pokemon.type2}${isShiny ? ', Shiny' : rarity === 'gmax' ? ', G-Max' : rarity === 'mega' ? ', Mega' : rarity === 'mythical' ? ', Mythical' : ''}`
        : `${pokemon.type1}${isShiny ? ', Shiny' : rarity === 'gmax' ? ', G-Max' : rarity === 'mega' ? ', Mega' : rarity === 'mythical' ? ', Mythical' : ''}`;
      const sprite = getPokemonSprite(pokemon, isShiny, rarity === 'gmax');
      huntEmbed.setTitle(`${isShiny ? '🌟 ' : rarity === 'gmax' ? '⚡ ' : rarity === 'mythical' ? '💎 ' : ''}${message.author.username} Found ${pokemonName}!`)
        .setDescription(`**Type**: ${typeStr}\n**HP**: ${pokemon.hp || 'N/A'}\n**Attack**: ${pokemon.attack || 'N/A'}\n**Defence**: ${pokemon.defense || 'N/A'}\n**Rarity**: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}${rarity === 'mythical' ? ' 💎' : ''}\n\n${huntPhases[2]} [▮▮▮▮▮▮▮▮▮▮]`)
        .setImage(sprite)
        .setThumbnail('https://cdn.discordapp.com/attachments/1379261289142161560/1380017972437057586/jinwoo2.png')
        .setColor(getRandomColor(pokemon.type1, pokemon.type2));
      await huntMsg.edit({ content: `<@${userId}>`, embeds: [huntEmbed] });

      await new Promise(resolve => setTimeout(resolve, 500));
      huntEmbed.setDescription(`**Type**: ${typeStr}\n**HP**: ${pokemon.hp || 'N/A'}\n**Attack**: ${pokemon.attack || 'N/A'}\n**Defence**: ${pokemon.defense || 'N/A'}\n**Rarity**: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}${rarity === 'mythical' ? ' 💎' : ''}\n\nAttempting to catch... [▮▮▮▮▮▮▮▮▯▯]`);
      await huntMsg.edit({ embeds: [huntEmbed] });

      await new Promise(resolve => setTimeout(resolve, 500));
      let caught = false;
      if (Math.random() < catchChance) {
        caught = true;
        const exists = await new Promise((resolve, reject) => {
          db.get('SELECT user_id FROM caught_pokemon WHERE user_id = ? AND pokemon_name = ?', [userId, pokemon.name], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!exists) {
          await new Promise((resolve, reject) => {
            db.run('INSERT INTO caught_pokemon (user_id, pokemon_id, pokemon_name, rarity, is_shiny, is_gmax, hp, attack, defense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [userId, pokemon.id || null, pokemon.name, rarity, isShiny ? 1 : 0, rarity === 'gmax' ? 1 : 0, pokemon.hp || 0, pokemon.attack || 0, pokemon.defense || 0], (err) => {
                if (err) {
                  if (err.code === 'SQLITE_CONSTRAINT') {
                    console.log(`Duplicate entry for ${pokemon.name} by ${userId} ignored.`);
                    resolve();
                  } else {
                    console.error('Insert error:', err);
                    reject(err);
                  }
                } else {
                  resolve();
                }
              });
          });
          await new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO users (user_id, nfx, total_earned) VALUES (?, COALESCE((SELECT nfx FROM users WHERE user_id = ?), 0) + 0.5, COALESCE((SELECT total_earned FROM users WHERE user_id = ?), 0) + 0.5)`,
              [userId, userId, userId], err => err ? reject(err) : resolve());
          });
        }
        huntEmbed.setTitle(`✅ ${message.author.username} Caught ${isShiny ? 'Shiny ' : ''}${pokemonName}!`)
          .setDescription(`**Type**: ${typeStr}\n**HP**: ${pokemon.hp || 'N/A'}\n**Attack**: ${pokemon.attack || 'N/A'}\n**Defence**: ${pokemon.defense || 'N/A'}\n**Rarity**: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}${rarity === 'mythical' ? ' 💎' : ''}\n\n${successPhases[0]} [▮▮▮▮▮▮▮▮▮▯]`)
          .setImage(sprite)
          .setThumbnail('https://cdn.discordapp.com/attachments/1379261289142161560/1380017972437057586/jinwoo2.png');
        await huntMsg.edit({ content: `<@${userId}>`, embeds: [huntEmbed] });

        await new Promise(resolve => setTimeout(resolve, 500));
        huntEmbed.setDescription(`**Type**: ${typeStr}\n**HP**: ${pokemon.hp || 'N/A'}\n**Attack**: ${pokemon.attack || 'N/A'}\n**Defence**: ${pokemon.defense || 'N/A'}\n**Rarity**: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}${rarity === 'mythical' ? ' 💎' : ''}\n\n${successPhases[1]}\nYou earned **0.5 ₣**! Check with \`!nfxcash\`.`);
        await huntMsg.edit({ embeds: [huntEmbed] });
      } else {
        huntEmbed.setTitle(`❌ ${pokemonName} Fled!`)
          .setDescription(`**Type**: ${typeStr}\n**HP**: ${pokemon.hp || 'N/A'}\n**Attack**: ${pokemon.attack || 'N/A'}\n**Defence**: ${pokemon.defense || 'N/A'}\n**Rarity**: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}${rarity === 'mythical' ? ' 💎' : ''}\n\n${failPhases[0]} [▮▮▮▮▮▮▮▯▯▯]`)
          .setImage(sprite)
          .setThumbnail('https://cdn.discordapp.com/attachments/1379261289142161560/1380017972437057586/jinwoo2.png');
        await huntMsg.edit({ content: `<@${userId}>`, embeds: [huntEmbed] });

        await new Promise(resolve => setTimeout(resolve, 500));
        huntEmbed.setDescription(`**Type**: ${typeStr}\n**HP**: ${pokemon.hp || 'N/A'}\n**Attack**: ${pokemon.attack || 'N/A'}\n**Defence**: ${pokemon.defense || 'N/A'}\n**Rarity**: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}${rarity === 'mythical' ? ' 💎' : ''}\n\n${failPhases[1]}\nBetter luck next time! Try \`!hunt\` again.`);
        await huntMsg.edit({ embeds: [huntEmbed] });
      }
    } catch (error) {
      console.error('Hunt error:', error);
      await message.channel.send({ embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! 🕵️‍♂️**`)
        .setDescription(`Something went wrong: ${error.message}\nTry \`!hunt\` again.`)
        .setColor(0xFF0000)
        .setFooter({ text: 'Developed by Moggerstark' })] });
    } finally {
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('Database connection closed.');
      });
    }
  }
};