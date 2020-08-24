console.log("Loading creatures.js")

let creatures = {
	antWorker: {
		name: "Giant Ant Worker",
		Health: 20,
		Damage: 2,
		ToHit: 1,
		Dodge: 1,
		xp: 1,
	},
	antWarrior: {
		name: "Giant Ant Warrior",
		Health: 30,
		Damage: 5,
		ToHit: 3,
		Dodge: 3,
		Block: 1,
		xp: 2,
	},
	antQueen: {
		name: "Giant Ant Queen",
		Health: 250,
		Damage: 15,
		ToHit: 15,
		Dodge: 15,
		Block: 6,
		CriticalHit: 0.5,
		CriticalDamage: 3,
		xp: 10,
	},
}