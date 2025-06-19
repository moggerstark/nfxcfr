const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = {
  getDb: (serverId) => {
    const dbPath = path.join(__dirname, `../data/${serverId}.db`);
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('Database error:', err.message);
      // Initialize tables
      db.run(`CREATE TABLE IF NOT EXISTS pokemon (
        id INTEGER PRIMARY KEY,
        name TEXT,
        type1 TEXT,
        type2 TEXT,
        hp INTEGER,
        attack INTEGER,
        defense INTEGER,
        sprite TEXT,
        rarity TEXT,
        is_three_stage INTEGER
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS caught_pokemon (
        user_id TEXT,
        pokemon_name TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        nfx INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        given INTEGER DEFAULT 0,
        taken INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        invites INTEGER DEFAULT 0,
        messages INTEGER DEFAULT 0,
        voice_minutes INTEGER DEFAULT 0,
        battle_wins INTEGER DEFAULT 0,
        battle_losses INTEGER DEFAULT 0
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS shop (
        item TEXT PRIMARY KEY,
        price INTEGER
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS quests (
        user_id TEXT,
        quest_type TEXT,
        progress INTEGER,
        reward INTEGER
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        server_id TEXT PRIMARY KEY,
        msg_channel TEXT,
        bot_channel TEXT,
        leaderboard_channel TEXT,
        ticket_category TEXT,
        ticket_staff_role TEXT,
        ticket_role TEXT,
        log_channel TEXT
      )`);
    });
    return db;
  },
  validateDatabase: (db) => {
    return new Promise((resolve, reject) => {
      const required = ['id', 'name', 'type1', 'type2', 'hp', 'attack', 'defense', 'sprite', 'rarity'];
      db.all('PRAGMA table_info(pokemon)', (err, columns) => {
        if (err) return reject(err);
        const columnNames = columns.map(col => col.name);
        const missing = required.filter(col => !columnNames.includes(col));
        const hasThreeStage = columnNames.includes('is_three_stage');
        const issues = [];
        if (!missing.length) {
          db.get(
            `SELECT COUNT(*) as count FROM pokemon WHERE name IS NULL OR
             type1 IS NULL OR hp IS NULL OR attack IS NULL OR
             defense IS NULL OR sprite IS NULL OR rarity IS NULL`,
            (err, row) => {
              if (err) return reject(err);
              if (row.count > 0) issues.push(`${row.count} NULL rows`);
              db.get(
                `SELECT COUNT(*) as count FROM pokemon WHERE rarity NOT IN
                 ('normal', 'rare', 'legendary', 'mythical', 'mega')`,
                (err, row) => {
                  if (err) return reject(err);
                  if (row.count > 0) issues.push(`${row.count} invalid rarities`);
                  resolve({ missing, hasThreeStage, issues });
                }
              );
            }
          );
        } else {
          resolve({ missing, hasThreeStage, issues });
        }
      });
    });
  }
};