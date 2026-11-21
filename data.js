// Lab data — copied from the "Plastic Recycling Challenge" worksheet.
// To change the lab, edit the numbers here. Densities are in g/cm³ (plastics) and g/mL (liquids).
window.LAB_DATA = {
  plastics: [
    { id: "PP",   name: "Polypropylene",               product: "Bottle caps",   density: 0.90, color: "#2f7de1", shape: "chip" },
    { id: "LDPE", name: "Low-density polyethylene",    product: "Plastic bags",  density: 0.92, color: "#f2c230", shape: "flake" },
    { id: "HDPE", name: "High-density polyethylene",   product: "Milk jugs",     density: 0.96, color: "#e9e4d8", shape: "square" },
    { id: "PET",  name: "Polyethylene terephthalate",  product: "Drink bottles", density: 1.38, color: "#3fb58a", shape: "shard" },
    { id: "PVC",  name: "Polyvinyl chloride",          product: "Pipes",         density: 1.40, color: "#e2573b", shape: "pellet" }
  ],
  liquids: [
    { id: "A",     name: "Engineered Liquid A", density: 0.87, tint: "#f6e7a6" },
    { id: "B",     name: "Engineered Liquid B", density: 0.91, tint: "#f5c6d6" },
    { id: "C",     name: "Engineered Liquid C", density: 0.94, tint: "#d6c8f2" },
    { id: "WATER", name: "Water",               density: 1.00, tint: "#bfe3f7" },
    { id: "D",     name: "Engineered Liquid D", density: 1.20, tint: "#c6ecc2" },
    { id: "E",     name: "Engineered Liquid E", density: 1.39, tint: "#f4cf9e" }
  ],
  piecesPerPlastic: 4
};
