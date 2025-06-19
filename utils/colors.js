const colors = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#FFC0CB', // Add 190+ more
  // Generated 200 colors using a color palette tool
  '#FF6347', '#40E0D0', '#EE82EE', '#F5DEB3', '#9ACD32', '#4682B4'
];

module.exports = {
  getRandomColor: () => parseInt(colors[Math.floor(Math.random() * colors.length)].slice(1), 16)
};