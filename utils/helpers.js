// Helper utilities for MATSHUKA bot
// Defines Pokémon type emojis and type effectiveness for battles

const TYPE_EMOJIS = {
  fire: '🔥', water: '💧', grass: '🌳', electric: '⚡', ice: '❄️',
  fighting: '👊', poison: '☠️', ground: '⛰️', flying: '🦅',
  psychic: '🔮', bug: '🐞', rock: '🪨', ghost: '👻', dragon: '🐉',
  dark: '🌑', steel: '⚙️', fairy: '✨', normal: null
};

const TYPE_EFFECTIVENESS = {
  fire: { grass: 1.5, water: 0.5, ice: 1.5, bug: 1.5, steel: 1.5 },
  water: { fire: 1.5, grass: 0.5, ground: 1.5, rock: 1.5 },
  grass: { water: 1.5, fire: 0.5, ground: 1.5, rock: 1.5 },
  electric: { water: 1.5, flying: 1.5, ground: 0.0 },
  ice: { grass: 1.5, ground: 1.5, flying: 1.5, dragon: 1.5, fire: 0.5 },
  fighting: { normal: 1.5, ice: 1.5, rock: 1.5, dark: 1.5, steel: 1.5 },
  poison: { grass: 1.5, fairy: 1.5, ground: 0.5, psychic: 0.5 },
  ground: { fire: 1.5, electric: 1.5, poison: 1.5, rock: 1.5, steel: 1.5 },
  flying: { grass: 1.5, fighting: 1.5, bug: 1.5, electric: 0.5 },
  psychic: { fighting: 1.5, poison: 1.5, dark: 0.0 },
  bug: { grass: 1.5, psychic: 1.5, dark: 1.5, fire: 0.5 },
  rock: { fire: 1.5, ice: 1.5, flying: 1.5, bug: 1.5 },
  ghost: { psychic: 1.5, ghost: 1.5, normal: 0.0 },
  dragon: { dragon: 1.5, ice: 0.5 },
  dark: { psychic: 1.5, ghost: 1.5, fighting: 0.5 },
  steel: { ice: 1.5, rock: 1.5, fairy: 1.5, fire: 0.5 },
  fairy: { fighting: 1.5, dragon: 1.5, dark: 1.5, poison: 0.5 }
};

module.exports = {
  TYPE_EMOJIS,
  TYPE_EFFECTIVENESS,
  getHealthBar: (hp, maxHp) => {
    const ratio = Math.max(0, Math.min(hp / maxHp, 1));
    const filled = Math.floor(ratio * 10);
    return '█'.repeat(filled) + '▒'.repeat(10 - filled) + ` ${hp}/${maxHp}`;
  },
  getAttackName: (type) => `${type.charAt(0).toUpperCase() + type.slice(1)} Strike`
};