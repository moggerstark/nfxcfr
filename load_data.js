const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db');

function loadData() {
  const pokemonData = [
    // Gen 1-9 base Pokémon
    { name: 'bulbasaur', rarity: 'normal', is_three_stage: 1, id: 1, hp: 45, attack: 49, defense: 49, type1: 'grass', type2: 'poison', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/bulbasaur.gif', is_shiny: 1, gmax_sprite: null, is_gmax: 0, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/bulbasaur.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/bulbasaur.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', gender: 'male' },
    { name: 'glimmet', rarity: 'normal', is_three_stage: 0, id: 969, hp: 48, attack: 35, defense: 42, type1: 'rock', type2: 'poison', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/glimmet.gif', is_shiny: 1, gmax_sprite: null, is_gmax: 0, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/glimmet.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/glimmet.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/969.png', gender: 'male' },
    // Mega forms
    { name: 'mega_charizard_x', rarity: 'mega', is_three_stage: 0, id: 10001, hp: 100, attack: 130, defense: 85, type1: 'fire', type2: 'dragon', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/charizard-mega-x.gif', is_shiny: 1, gmax_sprite: null, is_gmax: 0, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/charizard-mega-x.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/charizard-mega-x.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10001.png', gender: 'male' },
    { name: 'mega_charizard_y', rarity: 'mega', is_three_stage: 0, id: 10002, hp: 100, attack: 104, defense: 78, type1: 'fire', type2: 'flying', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/charizard-mega-y.gif', is_shiny: 1, gmax_sprite: null, is_gmax: 0, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/charizard-mega-y.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/charizard-mega-y.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10002.png', gender: 'male' },
    // G-Max forms
    { name: 'charizard_gmax', rarity: 'gmax', is_three_stage: 0, id: 20001, hp: 78, attack: 84, defense: 78, type1: 'fire', type2: 'flying', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/charizard-gmax.gif', is_shiny: 1, gmax_sprite: 'https://play.pokemonshowdown.com/sprites/ani/charizard-gmax.gif', is_gmax: 1, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/charizard-gmax.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/charizard-gmax.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png', gender: 'male' },
    { name: 'butterfree_gmax', rarity: 'gmax', is_three_stage: 0, id: 20005, hp: 60, attack: 45, defense: 50, type1: 'bug', type2: 'flying', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/butterfree-gmax.gif', is_shiny: 1, gmax_sprite: 'https://play.pokemonshowdown.com/sprites/ani/butterfree-gmax.gif', is_gmax: 1, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/butterfree-gmax.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/butterfree-gmax.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/12.png', gender: 'male' },
    // Legendary forms
    { name: 'tapu_fini', rarity: 'legendary', is_three_stage: 0, id: 788, hp: 70, attack: 75, defense: 115, type1: 'water', type2: 'fairy', shiny_sprite: 'https://play.pokemonshowdown.com/sprites/ani-shiny/tapu-fini.gif', is_shiny: 1, gmax_sprite: null, is_gmax: 0, animated_sprite: 'https://play.pokemonshowdown.com/sprites/ani/tapu-fini.gif', ani_back: 'https://play.pokemonshowdown.com/sprites/ani-back/tapu-fini.gif', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/788.png', gender: null }
  ];

  db.serialize(() => {
    db.run('DELETE FROM pokemon');
    const stmt = db.prepare('INSERT OR REPLACE INTO pokemon (name, rarity, is_three_stage, id, hp, attack, defense, type1, type2, shiny_sprite, is_shiny, gmax_sprite, is_gmax, animated_sprite, ani_back, sprite, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    pokemonData.forEach(p => stmt.run([p.name, p.rarity, p.is_three_stage, p.id, p.hp, p.attack, p.defense, p.type1, p.type2, p.shiny_sprite, p.is_shiny, p.gmax_sprite, p.is_gmax, p.animated_sprite, p.ani_back, p.sprite, p.gender]));
    stmt.finalize();
    db.run('DELETE FROM caught_pokemon');
  });

  db.close();
}

loadData();
console.log('Pokémon data loaded successfully!');
EOF