let creatures = {
	"a": {
		name: "Giant Ant Worker",
		Health: 20,
		Damage: 2.2,
		ToHit: 1,
		Dodge: 1,
		xp: 1,
		base_level: 2,
	},
	"r": {
		name: "Giant Ant Warrior",
		Health: 30,
		Damage: 6,
		ToHit: 2,
		Dodge: 2,
		Protection: 3,
		xp: 2,
		base_level: 0,
	},
	"q": {
		name: "Giant Ant Queen",
		Health: 600,
		Damage: 50,
		ToHit: 50,
		Dodge: 50,
		Protection: 50,
		CriticalHit: 0.5,
		CriticalDamage: 3,
		xp: 10,
		base_level: -8,
	},
	"g": {
		name: "Goblin",
		Health: 80,
		Damage: 12,
		ToHit: 10,
		Dodge: 6,
		CriticalHit: 0.05,
		xp: 3,
		ai: "Nearest",
		base_level: -6,
	},
	"w": {
		name: "Warg",
		Health: 40,
		Damage: 18,
		ToHit: 5,
		Dodge: 20,
		Protection: 8,
		Haste: 0.1,
		xp: 2,
		ai: "Nearest",
		base_level: -9,
	},
	"A": {
		name: "Goblin Archer",
		Health: 20,
		Damage: 20,
		ToHit: 15,
		Dodge: 6,
		Range: 3,
		xp: 5,
		ai: "Nearest",
		base_level: -15,
	},
	"h": {
		name: "Hobgoblin",
		Health: 3000,
		Damage: 500,
		ToHit: 300,
		Dodge: 200,
		CriticalHit: 0.5,
		CriticalDamage: 3,
		xp: 10,
		ai: "Nearest",
		base_level: -18,
	},
	"G": {
		name: "Golem",
		Health: 970,
		Damage: 30,
		ToHit: 50,
		Dodge: 10,
		Protection: 40,
		Regeneration: 1,
		Block: 30,
		xp: 6,
		ai: "Simple",
		base_level: -16,
		level_softcap: 8,
	},
	"z": {
		name: "Zombie",
		Health: 600,
		Damage: 40,
		ToHit: 40,
		Dodge: 5,
		Protection: 20,
		Bleed: 0.1,
		xp: 1,
		ai: "Simple",
		base_level: -19,
	},
	"R": {
		name: "Revenant",
		Health: 10000,
		Damage: 140,
		ToHit: 100,
		Dodge: 25,
		Protection: 40,
		Regeneration: 100,
		xp: 20,
		ai: "Coward",
		base_level: -20,
	},
	"n": {
		name: "Necromancer",
		Health: 50000,
		Damage: 1000,
		ToHit: 50,
		Dodge: 50,
		Mana: 20,
		ManaRegeneration: 2,
		xp: 60,
		spell: new Summon("z", 10, 20),
		ai: "Summoner",
		base_level: -28,
	}
}