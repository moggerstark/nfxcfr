const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db');

function loadShowdownData() {
  const pokemonData = [
    { id: 1, name: 'bulbasaur', rarity: 'normal', type1: 'grass', type2: 'poison', hp: 45, attack: 49, defense: 49, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/bulbasaur.gif', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/bulbasaur.gif', sprite: 'https://play.pokemonshowdown.com/sprites/xy/1.png' },
    { id: 4, name: 'charmander', rarity: 'normal', type1: 'fire', hp: 39, attack: 52, defense: 43, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/charmander.gif', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/charmander.gif', sprite: 'https://play.pokemonshowdown.com/sprites/xy/4.png' },
    { id: 7, name: 'squirtle', rarity: 'normal', type1: 'water', hp: 44, attack: 48, defense: 65, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/squirtle.gif', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/squirtle.gif', sprite: 'https://play.pokemonshowdown.com/sprites/xy/7.png' },
    { id: 25, name: 'pikachu', rarity: 'normal', type1: 'electric', hp: 35, attack: 55, defense: 40, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/pikachu.gif', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/pikachu.gif', sprite: 'https://play.pokemonshowdown.com/sprites/xy/25.png' },
    { id: 150, name: 'mewtwo', rarity: 'legendary', type1: 'psychic', hp: 106, attack: 110, defense: 90, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/mewtwo.gif', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/mewtwo.gif', sprite: 'https://play.pokemonshowdown.com/sprites/xy/150.png' }
  ];

  db.serialize(() => {
    db.run('DELETE FROM pokemon');
    const stmt = db.prepare('INSERT INTO pokemon (id, name, rarity, type1, type2, hp, attack, defense, animated_sprite, shiny_sprite, sprite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    pokemonData.forEach(p => stmt.run([p.id, p.name, p.rarity, p.type1, p.type2 || null, p.hp, p.attack, p.defense, p.animated_sprite, p.shiny_sprite, p.sprite]));
    stmt.finalize();
  });

  db.close();
  console.log('Pokémon data loaded successfully!');
}

loadShowdownData();