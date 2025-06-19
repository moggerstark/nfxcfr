module.exports = {
  getRandomRoast: (attacker, target) => {
    const roasts = [
      `${attacker} says ${target}'s moves are weaker than a Magikarp's Splash! 💦`,
      `${target}'s ${attacker} looks like it fainted before the battle started! 😴`,
      `${attacker} roasted ${target} so bad, they need a Burn Heal! 🔥`,
      `${target}'s strategy is as useless as a Metapod's Harden! 🐛`,
      `${attacker} says ${target}'s Pokémon are slower than a Slowpoke on vacation! 🐢`,
      `${target}'s ${attacker} got roasted worse than a Charmander in a volcano! 🌋`,
      `${attacker} laughs at ${target}'s team—more like Team Rocket rejects! 🚀`,
      `${target}'s ${attacker} is so weak, it couldn't even lift a Pokéball! ⚾`,
      `${attacker} says ${target}'s battle skills are as good as a Wobbuffet's attack! 😜`,
      `${target}'s ${attacker} ran away faster than a Rattata from a Hyper Beam! 🏃`
    ];
    return roasts[Math.floor(Math.random() * roasts.length)];
  },
  getCrowdReaction: (attacker, target) => {
    const reactions = [
      `The crowd cheers for ${attacker}'s epic move! 🎉`,
      `Ouch! The crowd gasps at ${target}'s defeat! 😲`,
      `${attacker} gets a standing ovation! 👏`,
      `${target} hears boos from the crowd! 😖`,
      `The crowd goes wild for ${attacker}'s combo! 🥳`,
      `${target}'s fumble makes the crowd laugh! 😂`,
      `${attacker}'s style has the crowd hyped! 🙌`,
      `${target}'s loss silences the stadium! 🤫`
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }
};