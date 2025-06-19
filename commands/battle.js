const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Hardcode database path to guild.db
const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db', (err) => {
  if (err) console.error('Database connection error:', err);
});

// Type effectiveness chart
const typeEffectiveness = {
  fire: { strong: ['grass', 'bug', 'ice', 'steel'], weak: ['water', 'rock', 'fire', 'dragon'], immune: [] },
  water: { strong: ['fire', 'ground', 'rock'], weak: ['grass', 'electric', 'water', 'dragon'], immune: [] },
  grass: { strong: ['water', 'ground', 'rock'], weak: ['fire', 'bug', 'poison', 'flying', 'dragon'], immune: [] },
  electric: { strong: ['water', 'flying'], weak: ['grass', 'electric', 'dragon'], immune: ['ground'] },
  psychic: { strong: ['fighting', 'poison'], weak: ['steel', 'psychic', 'dark'], immune: [] },
  ghost: { strong: ['ghost', 'psychic'], weak: ['normal', 'dark'], immune: ['normal', 'fighting'] },
  unknown: { strong: [], weak: [], immune: [] }
};

// Move mappings by type
const moveMap = {
  fire: { fast: '**Ember**', charge: '**Flamethrower**' },
  water: { fast: '**Water Gun**', charge: '**Hydro Pump**' },
  grass: { fast: '**Vine Whip**', charge: '**Solar Beam**' },
  electric: { fast: '**Thunder Shock**', charge: '**Thunderbolt**' },
  psychic: { fast: '**Confusion**', charge: '**Psychic**' },
  ghost: { fast: '**Lick**', charge: '**Shadow Ball**' },
  unknown: { fast: '**Tackle**', charge: '**Hyper Beam**' }
};

// Type-based colors
const typeColors = {
  fire: 0xFF4500, water: 0x1E90FF, grass: 0x32CD32, electric: 0xFFFF00,
  psychic: 0xFF69B4, ghost: 0x4B0082, unknown: 0x808080
};

// G-Max name mappings
const gmaxNameMap = {
  venusaur: 'venusaur-gmax', charizard: 'charizard-gmax', blastoise: 'blastoise-gmax', pikachu: 'pikachu-gmax',
  butterfree: 'butterfree-gmax', machamp: 'machamp-gmax', gengar: 'gengar-gmax', kingler: 'kingler-gmax',
  lapras: 'lapras-gmax', eevee: 'eevee-gmax', snorlax: 'snorlax-gmax', garbodor: 'garbodor-gmax',
  melmetal: 'melmetal-gmax', corviknight: 'corviknight-gmax', orbeetle: 'orbeetle-gmax', drednaw: 'drednaw-gmax',
  coalossal: 'coalossal-gmax', flapple: 'flapple-gmax', appletun: 'appletun-gmax', sandaconda: 'sandaconda-gmax',
  toxtricity: 'toxtricity-gmax', centiskorch: 'centiskorch-gmax', hatterene: 'hatterene-gmax',
  grimmsnarl: 'grimmsnarl-gmax', alcremie: 'alcremie-gmax', copperajah: 'copperajah-gmax',
  duraludon: 'duraludon-gmax', urshifu: 'urshifu-single-strike-gmax', cinderace: 'cinderace-gmax',
  inteleon: 'inteleon-gmax', rillaboom: 'rillaboom-gmax'
};

// Mega name mappings (example, expand as needed)
const megaNameMap = {
  charizard: 'charizard-mega-x', blastoise: 'blastoise-mega', venusaur: 'venusaur-mega'
};

// Trainer names
const trainerNames = ['Brock', 'Ash Ketchum', 'Misty', 'Gary Oak', 'Lance'];

// Utilities
const getRandomColor = () => {
  const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
  return colors[Math.floor(Math.random() * colors.length)];
};

const gifs = [
  "https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  ...Array(78).fill("https://media.giphy.com/media/3o7btPCcdNniB1K4iI/giphy.gif")
];

const getRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

const pokemonIdCache = new Map();
async function getPokemonSprite(pokemon, isShiny = false, isGmax = false) {
  if (!pokemon || typeof pokemon.name !== 'string') {
    console.error('Invalid pokemon:', pokemon);
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
  }
  const cacheKey = `${pokemon.name}_${isShiny}_${isGmax}`;
  if (!pokemonIdCache.has(cacheKey)) {
    let sprite = isGmax && pokemon.is_gmax ? pokemon.gmax_sprite ||
               `https://play.pokemonshowdown.com/sprites/ani/${gmaxNameMap[pokemon.name.toLowerCase()] || pokemon.name}.gif` :
             isGmax && megaNameMap[pokemon.name.toLowerCase()] ? `https://play.pokemonshowdown.com/sprites/ani/${megaNameMap[pokemon.name.toLowerCase()]}.gif` :
             isShiny && pokemon.shiny_sprite ? pokemon.shiny_sprite :
             pokemon.animated_sprite || pokemon.sprite ||
             `https://play.pokemonshowdown.com/sprites/ani/${pokemon.name}.gif` ||
             `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id || 1}.png`;
    if (!sprite || sprite.includes('bulbasaur')) {
      console.warn(`Sprite failure for ${pokemon.name} (${isShiny ? 'shiny' : isGmax ? 'gmax' : 'normal'}): ${sprite}`);
      sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id || 1}.png`;
      pokemonIdCache.delete(cacheKey);
    }
    pokemonIdCache.set(cacheKey, sprite);
    console.log(`Sprite for ${pokemon.name} (${isShiny ? 'shiny' : isGmax ? 'gmax' : 'normal'}): ${sprite}`);
  }
  return pokemonIdCache.get(cacheKey);
}

const createHPBar = (currentHP, maxHP) => {
  const barLength = 10;
  const hpRatio = currentHP / maxHP;
  const filled = Math.round(hpRatio * barLength);
  const greenCount = hpRatio > 0.5 ? filled : Math.round(filled * (hpRatio / 0.5));
  const redCount = filled - greenCount;
  const emptyCount = barLength - filled;
  return '🟩'.repeat(greenCount) + '🟥'.repeat(redCount) + '⬜'.repeat(emptyCount);
};

const energyBar = (energy) => {
  const barLength = 10;
  const energyRatio = energy / 100;
  const filled = Math.round(energyRatio * barLength);
  return '🟦'.repeat(filled) + '⬜'.repeat(barLength - filled);
};

// Initialize pokemonCache
const pokemonCache = {
  normal: {}, rare: {}, legendary: {}, mythical: {}, mega: {}, three_stage: {}, shiny: {}, gmax: {}
};

async function initializePokemonCache() {
  const categories = ['normal', 'rare', 'legendary', 'mythical', 'mega', 'three_stage', 'shiny', 'gmax'];
  for (const category of categories) {
    pokemonCache[category] = {};
  }
  console.log('Pokemon cache initialized:', Object.keys(pokemonCache));
}

initializePokemonCache();

module.exports = {
  name: 'battle',
  aliases: ['b'],
  cooldown: 7,
  async execute(message, args, client) {
    try {
      const gifUrl = getRandomGif();

      const challengeEmbed = new EmbedBuilder()
        .setTitle(`**Battle Challenge! ⚔️**`)
        .setDescription(`${message.author} has been challenged by a wild trainer!`)
        .setColor(0x808080)
        .setThumbnail(gifUrl)
        .setFooter({ text: 'Developed by Moggerstark' });

      const acceptButton = new ButtonBuilder().setCustomId('accept_challenge').setLabel('Accept ✅').setStyle(ButtonStyle.Success);
      const declineButton = new ButtonBuilder().setCustomId('decline_challenge').setLabel('Decline ❌').setStyle(ButtonStyle.Danger);
      const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

      const challengeMessage = await message.channel.send({ content: `${message.author}`, embeds: [challengeEmbed], components: [buttonRow] });
      const challengeCollector = challengeMessage.createMessageComponentCollector({ time: 60000 });
      let challengeAccepted = false;

      await new Promise((resolve) => {
        challengeCollector.on('collect', async interaction => {
          if (interaction.user.id !== message.author.id) {
            await interaction.reply({ content: 'This challenge is not for you!', ephemeral: true });
            return;
          }
          try {
            if (interaction.customId === 'accept_challenge') {
              challengeAccepted = true;
              await interaction.update({
                embeds: [new EmbedBuilder()
                  .setTitle(`**Challenge Accepted! ⚔️**`)
                  .setDescription(`${message.author.username} has accepted the battle against a wild trainer!`)
                  .setColor(0x00FF00)
                  .setThumbnail(gifUrl)
                  .setFooter({ text: 'Developed by Moggerstark' })],
                components: []
              });
              challengeCollector.stop();
              resolve();
            } else if (interaction.customId === 'decline_challenge') {
              await interaction.update({
                embeds: [new EmbedBuilder()
                  .setTitle(`**Challenge Declined! ⚔️**`)
                  .setDescription(`${message.author.username} declined the battle.`)
                  .setColor(0xff0000)
                  .setThumbnail(gifUrl)
                  .setFooter({ text: 'Developed by Moggerstark' })],
                components: []
              });
              challengeCollector.stop();
              resolve();
            }
          } catch (error) {
            if (error.code === 'InteractionAlreadyReplied') {
              await interaction.followUp({ content: 'Interaction already handled!', ephemeral: true });
            } else {
              console.error('Challenge interaction error:', error);
            }
          }
        });
        challengeCollector.on('end', () => {
          if (!challengeAccepted) {
            challengeMessage.edit({
              embeds: [new EmbedBuilder()
                .setTitle(`**Challenge Expired! ⚔️**`)
                .setDescription(`The battle challenge for ${message.author.username} has expired.`)
                .setColor(0xff0000)
                .setThumbnail(gifUrl)
                .setFooter({ text: 'Developed by Moggerstark' })],
              components: []
            });
            resolve();
          }
        });
      });

      if (!challengeAccepted) return;

      const fetchPokemon = async (userId, category) => {
        const cacheKey = `${userId}-${category}`;
        if (!pokemonCache[category]) {
          pokemonCache[category] = {};
        }
        if (!pokemonCache[category][userId]) {
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
          const pokemon = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows || []));
          });
          pokemonCache[category][userId] = pokemon;
        }
        return pokemonCache[category][userId];
      };

      const player1Pokemon = await fetchPokemon(message.author.id, 'normal');
      if (!player1Pokemon.length) {
        return message.channel.send({ embeds: [new EmbedBuilder()
          .setTitle(`**${message.author.username}, Oops! ⚔️**`)
          .setDescription('**You have no Pokémon!** Catch some with `!hunt`.')
          .setColor(0xff0000)
          .setThumbnail(gifUrl)
          .setFooter({ text: 'Developed by Moggerstark' })] });
      }

      const categories = ['normal', 'rare', 'legendary', 'mythical', 'mega', 'three_stage', 'shiny', 'gmax'];
      let p1Category = 'normal';
      let p1DropdownPage = 0;
      const player1Choices = [];

      const updatePlayer1Embed = async () => {
        const pokemon = await fetchPokemon(message.author.id, p1Category);
        const embed = new EmbedBuilder()
          .setTitle(`**${message.author.username}, Pick Pokémon ${player1Choices.length + 1}/3: ${p1Category.charAt(0).toUpperCase() + p1Category.slice(1)} ⚔️**`)
          .setColor(p1Category === 'legendary' ? 0xFFD700 : p1Category === 'mythical' ? 0xFF69B4 : p1Category === 'mega' ? 0xFF4500 : p1Category === 'rare' ? 0x1E90FF : p1Category === 'three_stage' ? 0x228B22 : p1Category === 'shiny' ? 0xC0C0C0 : p1Category === 'gmax' ? 0xFF8C00 : 0x808080)
          .setThumbnail(gifUrl)
          .setFooter({ text: `Page ${p1DropdownPage + 1} | Developed by Moggerstark` });

        let components = [];
        const categorySelect = new StringSelectMenuBuilder()
          .setCustomId('p1_category_select')
          .setPlaceholder('Change Category 📋')
          .addOptions(categories.map(cat => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            value: cat,
            emoji: cat === 'legendary' ? '⭐' : cat === 'mythical' ? '💎' : cat === 'mega' ? '⚡' : cat === 'rare' ? '🪨' : cat === 'three_stage' ? '🌿' : cat === 'shiny' ? '🌟' : cat === 'gmax' ? '⚡' : '⚪'
          })));
        components.push(new ActionRowBuilder().addComponents(categorySelect));

        if (!pokemon.length) {
          embed.setDescription(`**No Pokémon in ${p1Category.charAt(0).toUpperCase() + p1Category.slice(1)}!** Choose another category.\n${player1Choices.length ? `**Selected**: ${player1Choices.join(', ')}` : ''}`);
          return { embed, components };
        }

        const uniquePokemonNames = [...new Set(pokemon.map(p => p.pokemon_name))];
        const validOptions = uniquePokemonNames
          .filter(name => !player1Choices.includes(name))
          .map(name => {
            const p = pokemon.find(p => p.pokemon_name === name);
            return {
              label: `${p.is_shiny ? '🌟 Shiny ' : p.is_gmax ? '⚡ G-Max ' : ''}${p.pokemon_name} (${p.rarity || 'Unknown'})`,
              value: p.pokemon_name
            };
          });

        const totalPages = Math.ceil(validOptions.length / 25);
        const start = p1DropdownPage * 25;
        const end = start + 25;
        const pageOptions = validOptions.slice(start, end);

        if (pageOptions.length > 0 && player1Choices.length < 3) {
          const select = new StringSelectMenuBuilder()
            .setCustomId(`p1_select_${message.id}_${player1Choices.length + 1}`)
            .setPlaceholder(`Pick Pokémon ${player1Choices.length + 1}/3 🐾 (Page ${p1DropdownPage + 1}/${totalPages})`)
            .addOptions(pageOptions);
          components.push(new ActionRowBuilder().addComponents(select));

          const prevButton = new ButtonBuilder()
            .setCustomId('prev_dropdown_p1')
            .setLabel('⬅️ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p1DropdownPage === 0);
          const nextButton = new ButtonBuilder()
            .setCustomId('next_dropdown_p1')
            .setLabel('Next ➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p1DropdownPage >= totalPages - 1);
          components.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
        } else if (player1Choices.length >= 3) {
          embed.setDescription(`**You have selected 3 Pokémon!** Waiting for the wild trainer.\n**Selected**: ${player1Choices.join(', ')}`);
          if (player1Choices.length > 0) {
            const lastSprite = await getPokemonSprite({ name: player1Choices[player1Choices.length - 1] });
            embed.setImage(lastSprite);
          }
        } else {
          embed.setDescription(`${player1Choices.length ? `**Selected**: ${player1Choices.join(', ')}\n\n` : ''}**No available Pokémon in ${p1Category.charAt(0).toUpperCase() + p1Category.slice(1)}!** Change category.`);
        }

        embed.setDescription(`${player1Choices.length ? `**Selected**: ${player1Choices.join(', ')}` : '**No Pokémon selected yet!**'}`);
        return { embed, components };
      };

      await message.channel.send(`${message.author}`);
      let p1Msg = await message.channel.send({ embeds: [(await updatePlayer1Embed()).embed], components: (await updatePlayer1Embed()).components });

      const collector = message.channel.createMessageComponentCollector({
        time: 120000,
        max: 100,
        idle: 30000
      });
      let battleStarted = false;

      await new Promise((resolve) => {
        collector.on('collect', async interaction => {
          if (interaction.customId.startsWith('p1_') && interaction.user.id !== message.author.id) {
            await interaction.reply({ content: 'This is not your selection!', ephemeral: true });
            return;
          }
          if (battleStarted) {
            await interaction.reply({ content: 'Battle has started or ended!', ephemeral: true });
            return;
          }
          try {
            await interaction.deferUpdate({ timeout: 5000 });
            console.log(`Deferred interaction: ${interaction.customId}`);

            if (interaction.customId === 'p1_category_select') {
              p1Category = interaction.values[0];
              p1DropdownPage = 0;
              const update = await updatePlayer1Embed();
              await p1Msg.edit({ embeds: [update.embed], components: update.components }).catch(err => {
                console.error('p1Msg edit failed:', err);
                interaction.followUp({ content: 'Failed to update. Try again!', ephemeral: true });
              });
              console.log(`Updated p1 category to ${p1Category}`);
            } else if (interaction.customId === 'prev_dropdown_p1') {
              p1DropdownPage = Math.max(0, p1DropdownPage - 1);
              const update = await updatePlayer1Embed();
              await p1Msg.edit({ embeds: [update.embed], components: update.components }).catch(err => {
                console.error('p1Msg prev edit failed:', err);
                interaction.followUp({ content: 'Failed to update. Try again!', ephemeral: true });
              });
              console.log(`Moved p1 to page ${p1DropdownPage}`);
            } else if (interaction.customId === 'next_dropdown_p1') {
              const pokemon = await fetchPokemon(message.author.id, p1Category);
              const uniquePokemonNames = [...new Set(pokemon.map(p => p.pokemon_name))];
              const validOptions = uniquePokemonNames.filter(name => !player1Choices.includes(name));
              const totalPages = Math.ceil(validOptions.length / 25);
              p1DropdownPage = Math.min(totalPages - 1, p1DropdownPage + 1);
              const update = await updatePlayer1Embed();
              await p1Msg.edit({ embeds: [update.embed], components: update.components }).catch(err => {
                console.error('p1Msg next edit failed:', err);
                interaction.followUp({ content: 'Failed to update. Try again!', ephemeral: true });
              });
              console.log(`Moved p1 to page ${p1DropdownPage}`);
            } else if (interaction.customId.startsWith('p1_select') && player1Choices.length < 3) {
              const choice = interaction.values[0];
              if (!player1Choices.includes(choice)) {
                player1Choices.push(choice);
                const update = await updatePlayer1Embed();
                await p1Msg.edit({ embeds: [update.embed], components: update.components }).catch(err => {
                  console.error('p1Msg select edit failed:', err);
                  interaction.followUp({ content: 'Failed to update. Try again!', ephemeral: true });
                });
                console.log(`p1 selected ${choice}, total: ${player1Choices.length}`);
              }
            }

            if (player1Choices.length === 3) {
              battleStarted = true;
              collector.stop();

              // Fetch bot's legendary Pokémon
              const botTrainer = trainerNames[Math.floor(Math.random() * trainerNames.length)];
              const botPokemonData = await new Promise((resolve, reject) => {
                db.all('SELECT name, type1, hp, attack, defense, id FROM pokemon WHERE rarity = ? ORDER BY RANDOM() LIMIT 3', ['legendary'], (err, rows) => {
                  if (err) reject(err);
                  else {
                    const enhancedPokemon = rows.map(p => {
                      const isGMax = Math.random() < 0.33;
                      const isMega = Math.random() < 0.33 && megaNameMap[p.name.toLowerCase()];
                      return {
                        ...p,
                        isGmax: isGMax ? 1 : 0,
                        isMega: isMega ? 1 : 0,
                        name: isGMax ? (gmaxNameMap[p.name.toLowerCase()] || p.name) : isMega ? (megaNameMap[p.name.toLowerCase()] || p.name) : p.name
                      };
                    });
                    resolve(enhancedPokemon);
                  }
                });
              });

              let battleEmbed = new EmbedBuilder()
                .setTitle(`**${message.author.username} vs ${botTrainer}! ⚔️**`)
                .setDescription(
                  `**${message.author.username}'s Team**: ${player1Choices.join(', ')}\n` +
                  `**${botTrainer}'s Team**: ${botPokemonData.map(p => p.name).join(', ')}\n` +
                  `**Battle Starting!** 🏟️`
                )
                .setColor(0x00FF00)
                .setThumbnail(gifUrl);
              const battleMsg = await message.channel.send({ embeds: [battleEmbed] });

              // Fetch Pokémon details
              const fetchPokemonData = async (names, userId) => {
                const details = [];
                for (const name of names) {
                  const pokemon = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM pokemon WHERE name = ?', [name], (err, row) => {
                      if (err) reject(err);
                      else resolve(row || { name, hp: 100, attack: 50, defense: 50, id: 1, type1: 'unknown' });
                    });
                  });
                  const caught = await new Promise((resolve, reject) => {
                    db.get('SELECT is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ? AND pokemon_name = ?', [userId, name], (err, row) => {
                      if (err) reject(err);
                      else resolve(row || { is_shiny: 0, is_gmax: 0 });
                    });
                  });
                  details.push({
                    ...pokemon,
                    currentHP: pokemon.hp || 100,
                    energy: 0,
                    isShiny: caught.is_shiny,
                    isGmax: caught.is_gmax,
                    status: null,
                    defense: pokemon.defense || 50
                  });
                }
                return details;
              };

              // Initialize teams
              const p1Team = await fetchPokemonData(player1Choices, message.author.id);
              const botTeam = await Promise.all(botPokemonData.map(async (p) => {
                return {
                  ...p,
                  currentHP: p.hp || 100,
                  energy: 0,
                  isShiny: 0,
                  status: null,
                  defense: p.defense || 50
                };
              }));

              // Battle logic (Single embed with turn-based sprites)
              let battleState = {
                player: { team: p1Team, active: 0, fainted: 0 },
                bot: { team: botTeam, active: 0, fainted: 0 },
                turn: 0,
                lastAction: '',
                currentAttacker: 'player' // Track current attacker
              };

              const calculateDamage = (attacker, defender, moveType, isCharge = false) => {
                const baseAttack = attacker.attack || 50;
                const baseDefense = defender.defense || 50;
                const baseDamage = isCharge ? baseAttack * 1.5 : baseAttack * 0.5;
                let multiplier = 1;
                const attackerType = (attacker.type1 || 'unknown').toLowerCase();
                const defenderType1 = (defender.type1 || 'unknown').toLowerCase();
                const defenderType2 = defender.type2 ? defender.type2.toLowerCase() : null;

                if (typeEffectiveness[attackerType]) {
                  if (typeEffectiveness[attackerType].strong.includes(defenderType1)) multiplier *= 2;
                  if (typeEffectiveness[attackerType].weak.includes(defenderType1)) multiplier *= 0.5;
                  if (typeEffectiveness[attackerType].immune.includes(defenderType1)) multiplier *= 0;
                  if (defenderType2 && typeEffectiveness[attackerType]) {
                    if (typeEffectiveness[attackerType].strong.includes(defenderType2)) multiplier *= 2;
                    if (typeEffectiveness[attackerType].weak.includes(defenderType2)) multiplier *= 0.5;
                    if (typeEffectiveness[attackerType].immune.includes(defenderType2)) multiplier *= 0;
                  }
                }

                const damage = Math.round((baseDamage * multiplier) / (baseDefense / 50));
                return { damage, multiplier };
              };

              const applyStatusEffect = (pokemon, moveType) => {
                if (Math.random() < 0.1) {
                  if (moveType === 'fire') {
                    pokemon.status = { type: 'burn', turns: 2, attackReduction: 0.1 };
                    return '**Burned!** 🔥 Attack reduced for 2 turns.';
                  } else if (moveType === 'electric') {
                    pokemon.status = { type: 'paralysis', turns: 2 };
                    return '**Paralyzed!** ⚡ May skip next turn.';
                  }
                }
                return '';
              };

              const updateBattleEmbed = async () => {
                const playerPokemon = battleState.player.team[battleState.player.active];
                const botPokemon = battleState.bot.team[battleState.bot.active]; // Removed const, reusing variable
                const playerHP = Math.max(0, playerPokemon.currentHP);
                const botHP = Math.max(0, botPokemon.currentHP);
                const playerEnergy = Math.min(100, playerPokemon.energy);
                const botEnergy = Math.min(100, botPokemon.energy);

                const attacker = battleState.currentAttacker === 'player' ? playerPokemon : botPokemon;
                const defender = battleState.currentAttacker === 'player' ? botPokemon : playerPokemon;
                const attackerSprite = await getPokemonSprite(attacker, attacker.isShiny, attacker.isGmax || attacker.isMega);
                const defenderSprite = await getPokemonSprite(defender, defender.isShiny, defender.isGmax || defender.isMega);

                const attackerType = (attacker.type1 || 'unknown').toLowerCase();
                const embedColor = typeColors[attackerType] || 0x808080;

                battleEmbed
                  .setTitle(`⚔️ Battle: ${message.author.username} vs ${botTrainer}`)
                  .setDescription(
                    `**${battleState.currentAttacker === 'player' ? '🔵' : '🔴'} ${attacker.name.charAt(0).toUpperCase() + attacker.name.slice(1)} ${attacker.isShiny ? '🌟' : attacker.isGmax ? '⚡' : attacker.isMega ? '⚡' : ''}**\n` +
                    `Type: ${[attacker.type1, attacker.type2].filter(Boolean).join(' / ') || 'Unknown'}\n` +
                    `HP: ${createHPBar(playerHP, playerPokemon.hp || 100)} (${playerHP}/${playerPokemon.hp || 100})\n` +
                    `Energy: ${energyBar(playerEnergy)} (${playerEnergy}/100)\n` +
                    `Status: ${playerPokemon.status ? playerPokemon.status.type : 'None'}\n` +
                    `──────────────────\n` +
                    `**${battleState.currentAttacker === 'player' ? '🔴' : '🔵'} ${defender.name.charAt(0).toUpperCase() + defender.name.slice(1)} ${defender.isShiny ? '🌟' : defender.isGmax ? '⚡' : defender.isMega ? '⚡' : ''}**\n` +
                    `Type: ${[defender.type1, defender.type2].filter(Boolean).join(' / ') || 'Unknown'}\n` +
                    `HP: ${createHPBar(botHP, botPokemon.hp || 100)} (${botHP}/${botPokemon.hp || 100})\n` +
                    `Energy: ${energyBar(botEnergy)} (${botEnergy}/100)\n` +
                    `Status: ${botPokemon.status ? botPokemon.status.type : 'None'}\n` +
                    `──────────────────\n` +
                    `**Turn ${battleState.turn + 1}: ${battleState.lastAction || 'Auto Battle in Progress...'}** 👊`
                  )
                  .setColor(embedColor)
                  .setImage(attackerSprite) // Show attacker's sprite
                  .setThumbnail(defenderSprite) // Show defender's sprite
                  .setFooter({ text: `Developed by Moggerstark • Cooldown: ${this.cooldown}s` })
                  .setTimestamp();

                await battleMsg.edit({ embeds: [battleEmbed] }).catch(err => console.error('Battle embed edit failed:', err));
              };

              // Auto battle loop (Turn-based with slow turns)
              while (battleState.player.fainted < battleState.player.team.length && battleState.bot.fainted < battleState.bot.team.length) {
                battleState.turn++;

                // Player's turn
                battleState.currentAttacker = 'player';
                const playerPokemon = battleState.player.team[battleState.player.active];
                const botPokemon = battleState.bot.team[battleState.bot.active]; // Reusing variable
                const moves = moveMap[(playerPokemon.type1 || 'unknown').toLowerCase()] || moveMap.unknown;

                const selectAction = (stateKey) => {
                  const activePokemon = battleState[stateKey].team[battleState[stateKey].active];
                  if (activePokemon.currentHP <= 0 || Math.random() < 0.1) return 'switch_pokemon';
                  if (activePokemon.energy >= 50) return 'charge_attack';
                  return 'fast_attack';
                };

                const playerAction = selectAction('player');
                const processAction = (action, stateKey) => {
                  const activePokemon = battleState[stateKey].team[battleState[stateKey].active];
                  const targetKey = stateKey === 'player' ? 'bot' : 'player';
                  const targetPokemon = battleState[targetKey].team[battleState[targetKey].active];

                  if (action === 'fast_attack') {
                    activePokemon.energy = Math.min(100, activePokemon.energy + 10);
                    const { damage, multiplier } = calculateDamage(activePokemon, targetPokemon, activePokemon.type1);
                    targetPokemon.currentHP = Math.max(0, targetPokemon.currentHP - damage);
                    const statusMsg = applyStatusEffect(targetPokemon, activePokemon.type1);
                    return `**${activePokemon.name.charAt(0).toUpperCase() + activePokemon.name.slice(1)} used ${moves.fast}!** 👊 ${multiplier === 2 ? 'Super Effective!' : multiplier === 0.5 ? 'Not Very Effective...' : multiplier === 0 ? 'No Effect!' : ''} ${statusMsg} (${damage} damage)`;
                  } else if (action === 'charge_attack' && activePokemon.energy >= 50) {
                    activePokemon.energy = Math.max(0, activePokemon.energy - 50);
                    const { damage, multiplier } = calculateDamage(activePokemon, targetPokemon, activePokemon.type1, true);
                    targetPokemon.currentHP = Math.max(0, targetPokemon.currentHP - damage);
                    const statusMsg = applyStatusEffect(targetPokemon, activePokemon.type1);
                    return `**${activePokemon.name.charAt(0).toUpperCase() + activePokemon.name.slice(1)} unleashes ${moves.charge}!** ⚡🌩️ ${multiplier === 2 ? 'Super Effective!' : multiplier === 0.5 ? 'Not Very Effective...' : multiplier === 0 ? 'No Effect!' : ''} ${statusMsg} (${damage} damage)`;
                  } else if (action === 'switch_pokemon') {
                    const team = battleState[stateKey].team;
                    const availableIndices = team.map((p, i) => p.currentHP > 0 && i !== battleState[stateKey].active ? i : null).filter(i => i !== null);
                    if (availableIndices.length > 0) {
                      battleState[stateKey].active = availableIndices[0];
                      return `**${team[battleState[stateKey].active].name.charAt(0).toUpperCase() + team[battleState[stateKey].active].name.slice(1)}** was switched in! 🔄`;
                    }
                    return '';
                  }
                  return '';
                };

                const playerMsg = processAction(playerAction, 'player');
                battleState.lastAction = playerMsg;
                await updateBattleEmbed();
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check for fainted Pokémon after Player's attack
                if (battleState.bot.team[battleState.bot.active].currentHP <= 0) {
                  battleState.bot.fainted++;
                  const next = battleState.bot.team.findIndex((p, i) => p.currentHP > 0 && i !== battleState.bot.active);
                  if (next !== -1) {
                    battleState.bot.active = next;
                    battleState.lastAction += `\n**${botTrainer}'s ${battleState.bot.team[battleState.bot.active].name.charAt(0).toUpperCase() + battleState.bot.team[battleState.bot.active].name.slice(1)}** was sent out!`;
                    await updateBattleEmbed();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                  }
                }

                // Bot's turn (if not ended)
                if (battleState.player.fainted < battleState.player.team.length && battleState.bot.fainted < battleState.bot.team.length) {
                  battleState.currentAttacker = 'bot';
                  const botAction = selectAction('bot');
                  const botMsg = processAction(botAction, 'bot');
                  battleState.lastAction = botMsg;
                  await updateBattleEmbed();
                  await new Promise(resolve => setTimeout(resolve, 3000));

                  // Check for fainted Pokémon after Bot's attack
                  if (battleState.player.team[battleState.player.active].currentHP <= 0) {
                    battleState.player.fainted++;
                    const next = battleState.player.team.findIndex((p, i) => p.currentHP > 0 && i !== battleState.player.active);
                    if (next !== -1) {
                      battleState.player.active = next;
                      battleState.lastAction += `\n**${message.author.username}'s ${battleState.player.team[battleState.player.active].name.charAt(0).toUpperCase() + battleState.player.team[battleState.player.active].name.slice(1)}** was sent out!`;
                      await updateBattleEmbed();
                      await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                  }
                }
              }

              // End battle (Single embed)
              const finalWinner = battleState.player.fainted < battleState.player.team.length ? message.author.username : botTrainer;
              await db.run(
                `INSERT OR REPLACE INTO users (user_id, nfx, total_earned, wins) VALUES (?, COALESCE((SELECT nfx FROM users WHERE user_id = ?), 0) + 0.5, COALESCE((SELECT total_earned FROM users WHERE user_id = ?), 0) + 0.5, COALESCE((SELECT wins FROM users WHERE user_id = ?), 0) + 1)`,
                [finalWinner === message.author.username ? message.author.id : 'bot', finalWinner === message.author.username ? message.author.id : 'bot', finalWinner === message.author.username ? message.author.id : 'bot', finalWinner === message.author.username ? message.author.id : 'bot']
              );

              const playerPokemon = battleState.player.team[battleState.player.active];
              const botPokemon = battleState.bot.team[battleState.bot.active];
              battleEmbed
                .setTitle(`✅ ${finalWinner} Wins!`)
                .setDescription(
                  `**🔵 ${playerPokemon.name.charAt(0).toUpperCase() + playerPokemon.name.slice(1)} ${playerPokemon.isShiny ? '🌟' : playerPokemon.isGmax ? '⚡' : ''}**\n` +
                  `HP: ${createHPBar(Math.max(0, playerPokemon.currentHP), playerPokemon.hp || 100)} [${Math.max(0, playerPokemon.currentHP)}/${playerPokemon.hp || 100}]\n` +
                  `──────────────────\n` +
                  `**🔴 ${botPokemon.name.charAt(0).toUpperCase() + botPokemon.name.slice(1)} ${botPokemon.isShiny ? '🌟' : botPokemon.isGmax ? '⚡' : botPokemon.isMega ? '⚡' : ''}**\n` +
                  `HP: ${createHPBar(Math.max(0, botPokemon.currentHP), botPokemon.hp || 100)} [${Math.max(0, botPokemon.currentHP)}/${botPokemon.hp || 100}]\n` +
                  `──────────────────\n` +
                  `**Result**: ${finalWinner} defeated ${finalWinner === message.author.username ? botTrainer : message.author.username}’s team! **0.5 ₣** awarded!`
                )
                .setColor(finalWinner === message.author.username ? 0x32CD32 : 0xFF0000)
                .setImage(await getPokemonSprite(playerPokemon, playerPokemon.isShiny, playerPokemon.isGmax))
                .setThumbnail(await getPokemonSprite(botPokemon, botPokemon.isShiny, botPokemon.isGmax || botPokemon.isMega));
              await battleMsg.edit({ content: `<@${message.author.id}>`, embeds: [battleEmbed] }).catch(err => console.error('Final edit failed:', err));

              await message.channel.send({
                embeds: [new EmbedBuilder()
                  .setTitle(`**Victory! 🏆 ${finalWinner} Wins!**`)
                  .setDescription(`**${finalWinner === message.author.username ? message.author.username : botTrainer} won the battle! Congrats!**\n**Earned 0.5 ₣!** 💰`)
                  .setColor(0x00CED1)
                  .setThumbnail(getRandomGif())
                  .setFooter({ text: 'Developed by Moggerstark' })]
              }).catch(err => console.error('Victory message failed:', err));

              resolve();
            }
          } catch (err) {
            console.error(`Interaction failed: ${err.message}`);
            await interaction.followUp({ content: 'Sorry, an error occurred. Please try again!', ephemeral: true }).catch(() => {});
          }
        });
        collector.on('end', () => {
          if (!battleStarted && player1Choices.length < 3) {
            message.channel.send({ embeds: [new EmbedBuilder()
              .setTitle(`**${message.author.username}: Battle Cancelled! ⚔️**`)
              .setDescription('**Battle cancelled due to timeout or incomplete selections!**')
              .setColor(0xff0000)] }).catch(err => console.error('Cancel message failed:', err));
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Battle error:', error);
      await message.channel.send({ embeds: [new EmbedBuilder()
        .setTitle(`**${message.author.username}, Error! ⚔️**`)
        .setDescription(`Something went wrong: ${error.message}\nUse \`!battle\` to start a battle.`)
        .setColor(0xff0000)
        .setFooter({ text: 'Developed by Moggerstark' })] }).catch(err => console.error('Error message failed:', err));
    }
  }
};