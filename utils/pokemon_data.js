import requests
import sqlite3
import time
import random

# Define legendary and gigantamax Pokémon lists
LEGENDARY_POKEMON = [
    'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'entei', 'raikou', 'suicune', 'lugia', 'ho-oh', 'celebi',
    'regirock', 'regice', 'registeel', 'latias', 'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
    'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
    'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram', 'zekrom', 'landorus', 'kyurem', 'victini', 'keldeo', 'meloetta', 'genesect',
    'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion',
    'type-null', 'silvally', 'tapu-koko', 'tapu-lele', 'tapu-bulu', 'tapu-fini', 'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'necrozma', 'magearna', 'marshadow', 'zeraora', 'meltan', 'melmetal',
    'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'regieleki', 'regidrago', 'glastrier', 'spectrier', 'calyrex', 'zarude',
    'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'koraidon', 'miraidon', 'pecharunt'
]

GIGANTAMAX_POKEMON = [
    'venusaur', 'charizard', 'blastoise', 'butterfree', 'pikachu', 'meowth', 'machamp', 'gengar', 'kingler', 'lapras',
    'eevee', 'snorlax', 'garbodor', 'melmetal', 'corviknight', 'orbeetle', 'drednaw', 'coalossal', 'flapple', 'appletun',
    'sandaconda', 'toxtricity', 'centiskorch', 'hatterene', 'grimmsnarl', 'alcremie', 'copperajah', 'duraludon',
    'urshifu-single-strike', 'urshifu-rapid-strike'
]

def init_db():
    """Initialize the SQLite database with the required schema."""
    print("Initializing database schema...")
    conn = sqlite3.connect('/home/runner/workspace/databases/guild.db')
    c = conn.cursor()
    c.executescript('''
        DROP TABLE IF EXISTS pokemon;
        DROP TABLE IF EXISTS caught_pokemon;
        DROP TABLE IF EXISTS user_catches;
        DROP TABLE IF EXISTS user_wallet;

        CREATE TABLE pokemon (
            name TEXT PRIMARY KEY,
            rarity TEXT,
            is_three_stage INTEGER,
            id INTEGER,
            hp INTEGER,
            attack INTEGER,
            shiny_sprite TEXT,
            is_shiny INTEGER DEFAULT 0,
            gmax_sprite TEXT,
            is_gmax INTEGER DEFAULT 0
        );

        CREATE TABLE caught_pokemon (
            user_id TEXT,
            pokemon_name TEXT,
            rarity TEXT,
            is_shiny INTEGER DEFAULT 0,
            is_gmax INTEGER DEFAULT 0
        );

        CREATE TABLE user_catches (
            user_id TEXT,
            catch_count INTEGER DEFAULT 0,
            last_shiny_legendary INTEGER DEFAULT 0,
            last_gmax INTEGER DEFAULT 0,
            PRIMARY KEY (user_id)
        );

        CREATE TABLE user_wallet (
            user_id TEXT,
            nfx_cash INTEGER DEFAULT 0,
            PRIMARY KEY (user_id)
        );
    ''')
    conn.commit()
    conn.close()
    print("Database schema initialized")

def fetch_with_retry(url, retries=3, delay=1):
    """Fetch URL with retries on failure."""
    for i in range(retries):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response
            print(f"Fetch failed for {url}, retry {i+1}/{retries}, status: {response.status_code}")
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
        time.sleep(delay)
    raise Exception(f"Failed to fetch {url} after {retries} retries")

def load_pokemon_data():
    """Load Pokémon data from PokéAPI and insert into database."""
    print("Loading Pokémon data from PokéAPI...")
    try:
        response = fetch_with_retry('https://pokeapi.co/api/v2/pokemon?limit=1010')
        pokemon_list = response.json()['results']
    except Exception as e:
        print(f"Error fetching Pokémon list: {e}")
        return

    inserted = 0
    batch_size = 50

    conn = sqlite3.connect('/home/runner/workspace/databases/guild.db')
    c = conn.cursor()

    for i in range(0, len(pokemon_list), batch_size):
        batch = pokemon_list[i:i + batch_size]
        print(f"Processing batch {i // batch_size + 1} of {len(pokemon_list) // batch_size + 1}")

        for pokemon in batch:
            try:
                poke_data = fetch_with_retry(pokemon['url']).json()
                name = poke_data['name'].lower()
                poke_id = poke_data['id']
                hp = next(stat['base_stat'] for stat in poke_data['stats'] if stat['stat']['name'] == 'hp')
                attack = next(stat['base_stat'] for stat in poke_data['stats'] if stat['stat']['name'] == 'attack')
                shiny_sprite = f"https://play.pokemonshowdown.com/sprites/ani-shiny/{name}.gif" if poke_id <= 905 else poke_data['sprites']['front_shiny'] or poke_data['sprites']['front_default']

                gmax_sprite = None
                if name in GIGANTAMAX_POKEMON:
                    try:
                        form_data = fetch_with_retry(f"https://pokeapi.co/api/v2/pokemon-form/{name}-gmax").json()
                        gmax_sprite = form_data['sprites']['front_default'] or None
                    except Exception as e:
                        print(f"Failed to fetch G-Max sprite for {name}: {e}")

                rarity = 'legendary' if name in LEGENDARY_POKEMON else 'normal'
                if name not in LEGENDARY_POKEMON:
                    if 'mega' in name:
                        rarity = 'mega'
                    elif name in GIGANTAMAX_POKEMON:
                        rarity = 'gmax'
                    elif random.random() < 0.15:
                        rarity = 'rare'

                is_three_stage = 1 if name in [
                    'bulbasaur', 'charmander', 'squirtle', 'chikorita', 'cyndaquil', 'totodile',
                    'treecko', 'torchic', 'mudkip', 'turtwig', 'chimchar', 'piplup',
                    'snivy', 'tepig', 'oshawott', 'chespin', 'fennekin', 'froakie',
                    'rowlet', 'litten', 'popplio', 'grookey', 'scorbunny', 'sobble'
                ] else 0

                c.execute('''
                    INSERT OR REPLACE INTO pokemon (name, rarity, is_three_stage, id, hp, attack, shiny_sprite, is_shiny, gmax_sprite, is_gmax)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (name, rarity, is_three_stage, poke_id, hp, attack, shiny_sprite, 0, gmax_sprite, 1 if name in GIGANTAMAX_POKEMON else 0))

                inserted += 1
                print(f"Inserted {name} (ID: {poke_id})")
            except Exception as e:
                print(f"Error loading Pokémon {pokemon['name']}: {e}")

        conn.commit()

    conn.close()
    print(f"Inserted {inserted} Pokémon")
    print("Pokémon data loading completed successfully")

if __name__ == "__main__":
    init_db()
    load_pokemon_data()