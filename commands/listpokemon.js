const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('/home/runner/workspace/databases/guild.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listpokemon')
    .setDescription('List all Pokémon with their sprites.'),
  async execute(interaction) {
    const pokemon = await new Promise((resolve, reject) => {
      db.all('SELECT name, rarity, animated_sprite FROM pokemon ORDER BY name LIMIT 10', [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    if (!pokemon.length) {
      await interaction.reply({ content: 'No Pokémon found!', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Pokémon List')
      .setDescription(pokemon.map(p => `**${p.name}** (${p.rarity}) - [Sprite](${p.animated_sprite || 'https://www.pkparaiso.com/imagenes/scarlet-violet/sprites/animados/bulbasaur.gif'})`).join('\n'))
      .setColor(0x00FF00)
      .setFooter({ text: 'Developed by Moggerstark 🐾' });

    await interaction.reply({ embeds: [embed] });
  }
};