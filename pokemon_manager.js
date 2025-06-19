const { Client, Collection, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
require('dotenv').config(); // For secure token handling

const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db');

// Initialize tables if they don't exist
db.run(`CREATE TABLE IF NOT EXISTS pokemon (
  id INTEGER PRIMARY KEY,
  name TEXT,
  rarity TEXT,
  type1 TEXT,
  type2 TEXT,
  hp INTEGER,
  attack INTEGER,
  defense INTEGER,
  spa INTEGER,
  spd INTEGER,
  spe INTEGER,
  ability1 TEXT,
  ability2 TEXT,
  shiny_sprite TEXT,
  is_shiny INTEGER DEFAULT 0,
  gmax_sprite TEXT,
  is_gmax INTEGER DEFAULT 0,
  animated_sprite TEXT,
  ani_back TEXT,
  sprite TEXT,
  gender TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  catch_rate REAL DEFAULT 0.75,
  hunts INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0
)`);

db.run(`CREATE TABLE IF NOT EXISTS caught_pokemon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  pokemon_name TEXT,
  rarity TEXT,
  is_shiny INTEGER DEFAULT 0,
  is_gmax INTEGER DEFAULT 0
)`);

db.run(`CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  nfx REAL DEFAULT 0,
  total_earned REAL DEFAULT 0
)`);

const typeColors = {
  fire: 0xFF4500, water: 0x1E90FF, grass: 0x32CD32, electric: 0xFFFF00,
  psychic: 0xFF69B4, ghost: 0x4B0082, dragon: 0x6A5ACD, poison: 0x9932CC,
  bug: 0x9ACD32, steel: 0xB0C4DE, normal: 0xA8A878, flying: 0x87CEEB,
  ground: 0xDEB887, fairy: 0xFFB6C1, fighting: 0xB22222, rock: 0xB8860B,
  ice: 0xADD8E6, dark: 0x696969, unknown: 0x808080
};

const goAnimations = {
  throw: 'https://media.giphy.com/media/3o7TKRNl2e2ps0gWVe/giphy.gif',
  shake: 'https://media.giphy.com/media/3o7TKRNl2e2ps0gWVe/giphy.gif',
  catchSuccess: 'https://media.giphy.com/media/3o7TKToZ9AJm5F2W3e/giphy.gif',
  escape: 'https://media.giphy.com/media/3o7TKRNl2e2ps0gWVe/giphy.gif'
};

const pokemonCache = new Map();

async function fetchAndLoadPokemonData() {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1010'); // All Pokémon up to Gen 9
    const pokemonList = response.data.results;

    db.serialize(() => {
      db.run('DELETE FROM pokemon');
      const stmt = db.prepare('INSERT INTO pokemon (id, name, rarity, type1, type2, hp, attack, defense, spa, spd, spe, ability1, ability2, shiny_sprite, animated_sprite, sprite, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const [index, p] of pokemonList.entries()) {
        const pokemonDetail = await axios.get(p.url);
        const types = pokemonDetail.data.types.map(t => t.type.name);
        const stats = pokemonDetail.data.stats;
        const abilities = pokemonDetail.data.abilities.map(a => a.ability.name).slice(0, 2);
        const sprite = `https://play.pokemonshowdown.com/sprites/xy/${index + 1}.png`;
        const shinySprite = `https://play.pokemonshowdown.com/sprites/ani-shiny/${p.name}.gif`;
        const animatedSprite = `https://play.pokemonshowdown.com/sprites/ani/${p.name}.gif`;
        stmt.run([
          index + 1, p.name, 'normal', types[0], types[1] || null,
          stats[0].base_stat, stats[1].base_stat, stats[2].base_stat,
          stats[3].base_stat, stats[4].base_stat, stats[5].base_stat,
          abilities[0] || null, abilities[1] || null, shinySprite, animatedSprite, sprite, 'unknown'
        ]);
      }
      stmt.finalize();
    });

    console.log('Pokémon data fetched and loaded successfully!');
  } catch (error) {
    console.error('Error fetching Pokémon data:', error);
  }
}

function getPokemonSprite(pokemon, isShiny = false) {
  if (!pokemon) return 'https://play.pokemonshowdown.com/sprites/xy/1.png';
  const cacheKey = `${pokemon.name}_${isShiny}`;
  if (!pokemonCache.has(cacheKey)) {
    pokemonCache.set(cacheKey, isShiny && pokemon.shiny_sprite ? pokemon.shiny_sprite : pokemon.animated_sprite || pokemon.sprite);
  }
  return pokemonCache.get(cacheKey);
}

function getUserCatchRate(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT catch_rate FROM user_stats WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      if (row) resolve(row.catch_rate);
      else {
        db.run('INSERT INTO user_stats (user_id, catch_rate) VALUES (?, 0.75)', [userId], () => resolve(0.75));
      }
    });
  });
}

function updateUserStats(userId, success) {
  db.run('UPDATE user_stats SET hunts = hunts + 1, successes = successes + ?, catch_rate = CASE WHEN successes + ? > hunts THEN 0.9 ELSE 0.75 END WHERE user_id = ?', [success ? 1 : 0, success ? 1 : 0, userId]);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.commands = new Collection();
client.commands.set('hunt', { execute: huntCommand });
client.commands.set('battle', { execute: battleCommand });
client.commands.set('pvp', { execute: pvpCommand });
client.commands.set('pokedex', { execute: pokedexCommand });
client.commands.set('inv', { execute: invCommand });

let spawnInterval;

async function huntCommand(message) {
  if (!message.member.permissions.has('ADMINISTRATOR')) {
    return message.reply('Only admins can toggle auto-hunt!');
  }

  if (spawnInterval) {
    clearInterval(spawnInterval);
    spawnInterval = null;
    return message.reply('Auto-hunt stopped!');
  } else {
    spawnInterval = setInterval(() => spawnPokemon(message.channel), 30000); // 30-second interval
    return message.reply('Auto-hunt started! Pokémon spawn every 30 seconds.');
  }
}

function spawnPokemon(channel) {
  db.all('SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 1', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return channel.send('Error spawning Pokémon!');
    }

    if (rows.length === 0) {
      return channel.send('No Pokémon to spawn! Fetch data first.');
    }

    const pokemon = rows[0];
    const isShiny = Math.random() < 0.01; // 1% shiny chance
    const sprite = getPokemonSprite(pokemon, isShiny);
    const catchChance = 0.3; // 30% base catch rate

    const embed = new EmbedBuilder()
      .setColor(typeColors[pokemon.type1.toLowerCase()] || 0x808080)
      .setTitle('Wild Pokémon Appeared!')
      .setDescription(`A wild ${pokemon.name}${isShiny ? ' (Shiny)' : ''} has appeared!`)
      .setImage(sprite)
      .setFooter(`Catch it with !catch (Chance: ${Math.round(catchChance * 100)}%)`);

    channel.send({ embeds: [embed] });

    channel.encounter = { pokemon: pokemon.name, isShiny, catchChance };
    setTimeout(() => {
      if (channel.encounter) {
        channel.send(`The ${pokemon.name} ran away!`);
        delete channel.encounter;
      }
    }, 30000); // 30-second timeout
  });
}

function catchCommand(message) {
  if (!message.channel.encounter) {
    return message.reply('No Pokémon to catch! Wait for a spawn.');
  }

  const { pokemon, isShiny, catchChance } = message.channel.encounter;
  const roll = Math.random();

  if (roll <= catchChance) {
    db.run('INSERT INTO caught_pokemon (user_id, pokemon_name, rarity, is_shiny) VALUES (?, ?, ?, ?)', [message.author.id, pokemon, isShiny ? 'shiny' : 'normal', isShiny ? 1 : 0]);
    db.run('INSERT OR REPLACE INTO users (user_id, nfx, total_earned) VALUES (?, COALESCE((SELECT nfx FROM users WHERE user_id = ?), 0) + 0.5, COALESCE((SELECT total_earned FROM users WHERE user_id = ?), 0) + 0.5)', [message.author.id, message.author.id, message.author.id]);
    updateUserStats(message.author.id, 1);

    const embed = new EmbedBuilder()
      .setColor(0x32CD32)
      .setTitle('Caught!')
      .setDescription(`You caught a ${pokemon}${isShiny ? ' (Shiny)' : ''}! Earned 0.5 ₣.`)
      .setImage(getPokemonSprite({ name: pokemon }, isShiny));
    message.channel.send({ embeds: [embed] });
    delete message.channel.encounter;
  } else {
    updateUserStats(message.author.id, 0);
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Escaped!')
      .setDescription(`The ${pokemon}${isShiny ? ' (Shiny)' : ''} escaped!`)
      .setImage(getPokemonSprite({ name: pokemon }, isShiny));
    message.channel.send({ embeds: [embed] });
    delete message.channel.encounter;
  }
}

async function battleCommand(message) {
  const userId = message.author.id.toString();
  const pokemon = await new Promise((resolve, reject) => db.get('SELECT * FROM caught_pokemon WHERE user_id = ? ORDER BY RANDOM() LIMIT 1', [userId], (err, row) => err ? reject(err) : resolve(row)));
  if (!pokemon) return message.reply('You have no Pokémon to battle! Catch one first.');

  const embed = new EmbedBuilder()
    .setColor(0xFFA500)
    .setTitle('Battle!')
    .setDescription(`You are battling with ${pokemon.pokemon_name}!`)
    .setImage(getPokemonSprite({ name: pokemon.pokemon_name }, pokemon.is_shiny));
  message.channel.send({ embeds: [embed] });
}

async function pvpCommand(message) {
  const userId = message.author.id.toString();
  const opponent = message.mentions.users.first();
  if (!opponent) return message.reply('Mention an opponent to start a PvP battle!');

  const userPokemon = await new Promise((resolve, reject) => db.get('SELECT * FROM caught_pokemon WHERE user_id = ? ORDER BY RANDOM() LIMIT 1', [userId], (err, row) => err ? reject(err) : resolve(row)));
  const oppPokemon = await new Promise((resolve, reject) => db.get('SELECT * FROM caught_pokemon WHERE user_id = ? ORDER BY RANDOM() LIMIT 1', [opponent.id], (err, row) => err ? reject(err) : resolve(row)));

  if (!userPokemon || !oppPokemon) return message.reply('One of you has no Pokémon!');

  const embed = new EmbedBuilder()
    .setColor(0x800080)
    .setTitle('PvP Battle!')
    .setDescription(`**${message.author.username}**'s ${userPokemon.pokemon_name} vs **${opponent.username}**'s ${oppPokemon.pokemon_name}!`)
    .setImage(getPokemonSprite({ name: userPokemon.pokemon_name }, userPokemon.is_shiny));
  message.channel.send({ embeds: [embed] });
}

async function pokedexCommand(message) {
  const pokemonName = message.content.split(' ')[1]?.toLowerCase();
  if (!pokemonName) return message.reply('Specify a Pokémon name! Example: !pokedex bulbasaur');

  const pokemon = await new Promise((resolve, reject) => db.get('SELECT * FROM pokemon WHERE name = ?', [pokemonName], (err, row) => err ? reject(err) : resolve(row)));
  if (!pokemon) return message.reply('Pokémon not found!');

  const embed = new EmbedBuilder()
    .setColor(typeColors[pokemon.type1.toLowerCase()] || 0x808080)
    .setTitle(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}`)
    .setDescription(`Rarity: ${pokemon.rarity}\nType: ${pokemon.type2 ? `${pokemon.type1}/${pokemon.type2}` : pokemon.type1}\nHP: ${pokemon.hp}, Attack: ${pokemon.attack}, Defense: ${pokemon.defense}`)
    .setImage(pokemon.animated_sprite || pokemon.sprite);
  message.channel.send({ embeds: [embed] });
}

async function invCommand(message) {
  const userId = message.author.id.toString();
  const caught = await new Promise((resolve, reject) => db.all('SELECT pokemon_name, rarity, is_shiny, is_gmax FROM caught_pokemon WHERE user_id = ?', [userId], (err, rows) => err ? reject(err) : resolve(rows)));
  if (!caught.length) return message.reply('Your inventory is empty!');

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${message.author.username}'s Inventory`)
    .setDescription(caught.map(p => `${p.pokemon_name} (${p.rarity}${p.is_shiny ? ', Shiny' : ''}${p.is_gmax ? ', G-Max' : ''})`).join('\n'));
  message.channel.send({ embeds: [embed] });
}

client.once('ready', async () => {
  console.log(`Bot online as ${client.user.tag}`);
  await fetchAndLoadPokemonData(); // Fetch and load Pokémon data on startup
});

client.on('messageCreate', message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    if (commandName === 'catch') catchCommand(message);
    else if (commandName === 'hunt') command.execute(message);
    else if (commandName === 'battle') battleCommand(message);
    else if (commandName === 'pvp') pvpCommand(message);
    else if (commandName === 'pokedex') pokedexCommand(message);
    else if (commandName === 'inv') invCommand(message);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing that command!');
  }
});

client.login(process.env.TOKEN); // Use .env for token