const LEVEL_MULT_BASE = 1000;

class Map {
	constructor(mapName, layout, vision, reward, conquerMessage){
		this.mapName = mapName;
		this.levelNo = maps.length;
		this.layout = layout;
		this.vision = vision;
		this.reward = reward;
		this.conquerMessage = conquerMessage;
		this.conquered = false;
		this.instantiated = false;
		this.enemies = [];
		this.map = null;
		this.nodesWithCreatures = [];
		this.mapNodes = [];
		this.deaths = 0;
	}

	instantiate(player_units){
		if (this.instantiated) return;
		this.instantiated = true;
		this.map = this.layout.map((row, y) => {
			row = row.split("");
			row = row.map((cell, x) => {
				if ("#._".includes(cell)) return cell;
				if ("♥♦♣♠".includes(cell)){
					let player_unit = player_units.find(unit => unit.character.includes(cell));
					if (player_unit){
						player_unit.x = x;
						player_unit.y = y;
					}
					return ".";
				}
				this.summon(x, y, cell);
				return ".";
			});
			row = row.map(c => [c, false]);
			return row;
		});
	}
	
	summon(x, y, creature, levelOverride = null){
		let levelMult = 1 / (Math.log(LEVEL_MULT_BASE + this.deaths) / Math.log(LEVEL_MULT_BASE));
		let enemy = creatures[creature];
		if (levelOverride){
			enemy.level = levelOverride * levelMult;
		} else {
			enemy.level = Math.min((enemy.base_level + this.levelNo), (enemy.base_level + this.levelNo + (enemy.level_softcap || Infinity)) / 2) * levelMult;
		}
		let enemyUnit = new Unit(false, enemy.name, enemy, enemy.ai || "Simple");
		enemyUnit.x = x;
		enemyUnit.y = y;
		enemyUnit.xp = enemy.xp;
		enemyUnit.name = enemy.name;
		enemyUnit.character = creature;
		enemyUnit.refillHealth();
		if (enemy.spell){
			enemyUnit.spell = enemy.spell;
		}
		this.enemies.push(enemyUnit);
		return enemyUnit;
	}

	checkComplete(){
		this.enemies = this.enemies.filter(unit => !unit.dead);
		if (this.enemies.length == 0){
			this.complete();
			return true;
		}
		return false;
	}

	complete(){
		if (!this.conquered){
			displayMessage(this.conquerMessage + ` (${this.mapName})`);
			if (currentLevel >= bestLevel) applyReward(this.reward);
		}
		if (activeChallenge){
			activeChallenge.updateReward();
		}
		this.conquered = true;
		this.uninstantiate();
		this.deaths = 0;
	}

	uninstantiate(){
		this.instantiated = false;
		this.map = null;
		oldEnemies = this.enemies;
		this.enemies = [];
		this.nodesWithCreatures = [];
		this.mapNodes = [];
		this.deaths++;
	}

	draw() {
		if (!this.instantiated) return;
		this.mapNodes = [];
		document.querySelector("#map-title").innerHTML = this.mapName;
		let rewardEl = document.querySelector("#map-reward");
		rewardEl.innerHTML = "Reward: " + this.reward.replace(/ /, " - ").replace(/(\w)([A-Z])/g, "$1 $2");
		if (bestLevel > this.levelNo){
			rewardEl.classList.add("complete");
		} else {
			rewardEl.classList.remove("complete");
		}
		let mapNode = document.querySelector("#map");
		while (mapNode.firstChild){
			mapNode.removeChild(mapNode.lastChild);
		}
		let rowTemplate = document.querySelector("#row-template");
		let cellTemplate = document.querySelector("#cell-template");
		for (let y = 0; y < this.map.length; y++){
			this.mapNodes[y] = [];
			let rowNode = rowTemplate.cloneNode(true);
			rowNode.removeAttribute("id");
			mapNode.append(rowNode);
			for (let x = 0; x < this.map[y].length; x++){
				let cellNode = cellTemplate.cloneNode(true);
				cellNode.removeAttribute("id");
				cellNode.setAttribute("data-x", x);
				cellNode.setAttribute("data-y", y);
				let [className, descriptor] = classMapping[this.map[y][x][0]];
				className = className.split(" ");
				for (let i = 0; i < className.length; i++){
					cellNode.classList.add(className[i]);
				}
				cellNode.setAttribute("data-content", descriptor);
				cellNode.classList.add("not-visible");
				rowNode.append(cellNode);
				this.mapNodes[y][x] = cellNode;
			}
		}
	}

	drawCreatures(player_units){
		this.nodesWithCreatures.forEach(node => {
			node.innerHTML = "";
			node.classList.remove("health-bar");
		});
		this.nodesWithCreatures = [];
		player_units.forEach((unit, i) => {
			if (unit.dead) return;
			let node = this.mapNodes[unit.y][unit.x];
			node.innerHTML = unit.character;
			node.classList.add("health-bar");
			node.setAttribute("data-health", Math.round(unit.stats.Health.current / unit.stats.Health.value * 100) + "%");
			this.nodesWithCreatures.push(node);
		});
		this.enemies.forEach(enemy => {
			if (enemy.dead) return;
			let node = this.mapNodes[enemy.y][enemy.x];
			node.innerHTML = "&nbsp;" + enemy.character;
			node.classList.add("health-bar");
			node.setAttribute("data-health", Math.round(enemy.stats.Health.current / enemy.stats.Health.value * 100) + "%");
			this.nodesWithCreatures.push(node);
		});
	}

	getVision(player_units){
		for (let i = 0; i < player_units.length; i++){
			if (player_units[i].dead) continue;
			for (let y = -this.vision; y <= this.vision; y++){
				// Continue if outside the bounds
				let effectiveY = y + player_units[i].y;
				if (effectiveY < 0 || effectiveY >= this.map.length) continue;
				for (let x = -(this.vision - Math.abs(y)); x <= this.vision - Math.abs(y); x++){
					let effectiveX = x + player_units[i].x;
					// Continue if outside the bounds
					if (effectiveX < 0 || effectiveX >= this.map[effectiveY].length) continue;
					// Continue if already visible
					if (this.map[effectiveY][effectiveX][1]) continue;
					// Check if there's line of sight
					if (this.isClearLine([effectiveX, effectiveY], [player_units[i].x, player_units[i].y])){
						this.map[effectiveY][effectiveX][1] = true;
						this.mapNodes[effectiveY][effectiveX].classList.remove("not-visible");
					}
				}
			}
		}
	}

	isClearLine(source, dest){
		let largerDist = Math.max(Math.abs(source[0] - dest[0]), Math.abs(source[1] - dest[1]));
		let currentDist = largerDist;
		while (currentDist--){
			let xCoord = dest[0] + Math.round((source[0] - dest[0]) / largerDist * currentDist);
			let yCoord = dest[1] + Math.round((source[1] - dest[1]) / largerDist * currentDist);
			if (this.map[yCoord][xCoord][0] == "#") return false;
		}
		return true;
	}

	tick(player_units){
		this.enemies.forEach(enemy => enemy.tick());
		this.getVision(player_units);
		this.drawCreatures(player_units);
	}

	getVisibleEnemies(){
		return this.enemies.filter(enemy => !enemy.dead && this.map[enemy.y][enemy.x][1]);
	}

	isVisible(unit){
		return this.map[unit.y][unit.x][1];
	}

	isVisibleSpace(x, y){
		return this.map[y][x][1];
	}

	isEmpty(x, y, ignoreCreatures = false){
		return this.map[y] && this.map[y][x] && this.map[y][x][0] == "." && (ignoreCreatures || (!this.enemies.some(enemy => enemy.x == x && enemy.y == y && !enemy.dead) && !playerUnits.some(unit => unit.x == x && unit.y == y && !unit.dead && unit.active)));
	}

	highlight(x, y){
		if (!this.mapNodes[0]) return;
		[...document.querySelectorAll(".highlight")].forEach(node => node.classList.remove("highlight"));
		if (!this.mapNodes[y] || !this.mapNodes[y][x]) return;
		this.mapNodes[y][x].classList.add("highlight");
	}

	noHighlight(){
		if (!this.mapNodes[0]) return;
		[...document.querySelectorAll(".highlight")].forEach(node => node.classList.remove("highlight"));
	}

	getAllUnexplored(){
		return this.map.map((row, y) => row.map((cell, x) => (cell[0] == "." && !cell[1] && !this.enemies.some(enemy => enemy.x == x && enemy.y == y)) ? [x, y] : false))
		               .flat()
		               .filter(x => x);
	}
}

let maps = [];

const classMapping = {
	"#": ["wall", "Solid Rock"],
	".": ["tunnel", "Open Tunnel"],
	"_": ["pit", "Deep Pit"],
};

/*
*	L	XP	CUM
*	***********ANTS**********
*	1	5	5
*	2	10	15
*	3	15	30
*	4	20	50
*	5	25	75
*	6	30	105
*	7	35	140
*	8	40	180
*	9	45	225
*	10	50	275
*	*********GOBLINS*********
*	11	36	311
*	12	42	353
*	13	48	401
*	14	54	455
*	15	60	515
*	16	66	581
*	17	72	653
*	18	78	731
*	19	84	815
*	20	90	905
*	*******GOLEMS*******
*	21	81	986
*	22	89	1075
*	23	97	1172
*	*******UNDEAD*******
*	24	105	1277
*	25	113	1390
*	26	121	1511
*	27	129	1640
*	28	137	1777
*	29	145	1922
*	30	153	2075 (Actually 140 + summons, which will be more than 153)
*	*******SPELLS*******
*	31	150 2225
*	32	160 2385
*	33	170 2385
*	34	180 2565
*	35	190 2755
*/

maps.push(new Map("Level 1",
					["###########",
					 "#♥♦##...###",
					 "#♣♠.......#",
					 "##.######a#",
					 "##.##...#.#",
					 "##....a.#.#",
					 "#####a..#.#",
					 "#####.###.#",
					 "##....##a.#",
					 "###.a.##.##",
					 "###..###..#",
					 "###########"],
					4,
					"ToHit",
					"Stepping over the broken bodies of your fallen foes... who are you kidding?  It's embarrassing that you took so long to beat up some ants.  You travel deeper into the cave."));

maps.push(new Map("Level 2",
					["###############",
					 "#♥♦.........###",
					 "#♣♠#######....#",
					 "##...####a...a#",
					 "##....a##a...##",
					 "###..a#####..##",
					 "#####...###.###",
					 "######..##....#",
					 "#a......###...#",
					 "##...#######..#",
					 "##a.a##...###.#",
					 "##...#...a##..#",
					 "###.###...##..#",
					 "###.###..###.a#",
					 "###......######",
					 "###############"],
					4,
					"Dodge",
					"There are far more of these creatures than you had expected.  You press on."));

maps.push(new Map("Level 3",
					["###########",
					 "#♥♦########",
					 "#♣♠.....aa#",
					 "##...#..aa#",
					 "##.....####",
					 "##.a....a##",
					 "##...#.#aa#",
					 "##..##...##",
					 "##aa###aaa#",
					 "##aa#######",
					 "###########"],
					4,
					"autoUnselect",
					"The tight confines of this anthill do not faze you.  You refuse to yield to fear."));

maps.push(new Map("Level 4",
					["###############",
					 "#♥♦....###...##",
					 "#♣♠###a..a.#..#",
					 "######.######.#",
					 "###.a..#a..a#.#",
					 "#...##.##.###.#",
					 "#.####.##..a..#",
					 "#.####.####.###",
					 "#..a##.##a#..##",
					 "######a##.##.##",
					 "#.a#...##.##a.#",
					 "#.##.#.##.###.#",
					 "#..a.#.#a..a..#",
					 "##.###.####.###",
					 "##.#a.a####..a#",
					 "##.###.######.#",
					 "##.###...a###.#",
					 "##a########a..#",
					 "###############"],
					4,
					"Autobuyer Damage",
					"The maze-like anthill goes deep into the ground.  You feel like you've been lost a dozen times or more by now."));

maps.push(new Map("Level 5",
					["#################",
					 "#♥♦.....a...#####",
					 "#♣♠.######.###r##",
					 "#.......##.r...##",
					 "#.#.###a#####a.##",
					 "#.#.###.#..##..##",
					 "#.#.###.ar.##.###",
					 "#.#a####...##.###",
					 "#.#..####.###.###",
					 "#a#....##......r#",
					 "#.##..##.a#####.#",
					 "#.###.##.######.#",
					 "#.###a....##r...#",
					 "#r###.###.###..##",
					 "#..#..###.##....#",
					 "##...####.##..r##",
					 "##...r......a.###",
					 "#################"],
					4,
					"Protection",
					"Larger, more dangerous ants have arrived.  You seem to be provoking the ants to deal with you."));

maps.push(new Map("Level 6",
					["#################",
					 "#♥♦...#.....#####",
					 "#♣♠....aa..###.##",
					 "#......#....a..##",
					 "#..#...a..a....##",
					 "#....a...##....##",
					 "##.a........r.###",
					 "#..#..#..r...####",
					 "#...r.........###",
					 "#.#....##...a...#",
					 "#.##..........a.#",
					 "#r###.##..r.....#",
					 "#####rr.........#",
					 "#####...#...#..##",
					 "####....#.#...r.#",
					 "##..r#.........##",
					 "##a.......r...###",
					 "#################"],
					5,
					"Autobuyer Health",
					"With each new level, the creatures seem to be getting stronger.  Surely there are great treasures to be discovered below!  You emerge into a larger cavern."));

maps.push(new Map("Level 7",
					["#################",
					 "#♥♦.........#####",
					 "#♣♠.........#####",
					 "#..#######rr....#",
					 "#..#.....#......#",
					 "#..#.....#####..#",
					 "#..#..#..#...r..#",
					 "#..#..#..#...r..#",
					 "#..#rr#.a#####..#",
					 "#..#..########..#",
					 "#..#.....#####..#",
					 "#rr......#####..#",
					 "#....##...r.....#",
					 "######..#.r.##..#",
					 "####....#####...#",
					 "##aaaa######...##",
					 "##aaaa........###",
					 "##aaaa.......r###",
					 "#################"],
					4,
					"multiXp",
					"The ants are getting larger and fiercer.  But you are getting stronger as well, and feel confident you can complete this challenge."));

maps.push(new Map("Level 8",
					["#####################",
					 "#♥♦............a.####",
					 "#♣♠.....a...........#",
					 "#################...#",
					 "##...a............#.#",
					 "#.a.....a.....#####a#",
					 "###.a.......#######.#",
					 "###.###..a#########.#",
					 "###..a...##########a#",
					 "##r.......r.####r...#",
					 "#.r.####r....####r.##",
					 "###..r####...####..##",
					 "##r.#####...#####..##",
					 "###.r###...######..##",
					 "##..####..###..#.r..#",
					 "##r#####..###rr#....#",
					 "##.##....#####..rr###",
					 "##......#######..####",
					 "#####################"],
					3,
					"Autobuyer ToHit",
					"The deeper you go, the stronger you feel - but the same can be said of your enemies.  Your torches flicker."));

maps.push(new Map("Level 9",
					["#################",
					 "#♥♦...#..r..#..##",
					 "#♣♠...##...###.##",
					 "#......#...r...##",
					 "#..#..a..###...##",
					 "#..##..r.##....##",
					 "##.a..a.....r.###",
					 "#r.##.#.#....####",
					 "#..a.r..#a##..###",
					 "#.#....##.......#",
					 "#r##..r....##.r.#",
					 "#.###.##....#...#",
					 "#r.##.r...r.#...#",
					 "#####...#...#.r##",
					 "###....r#.#r....#",
					 "#r.r.###r##.#..##",
					 "##.#...rr.....###",
					 "#################"],
					2,
					"Autobuyer Dodge",
					"You continue cautiously into the dark.  Surely it won't be long before you manage to conquer this anthill."));

maps.push(new Map("Level 10",
					["#################",
					 "#♥♦........a..###",
					 "#♣♠......r...a.##",
					 "#....rr..r....###",
					 "#######....######",
					 "#######....######",
					 "#######a..a######",
					 "#######.aa.######",
					 "#######....######",
					 "#######....######",
					 "#######....######",
					 "#######.rr.######",
					 "#######r..r######",
					 "######......#####",
					 "#####r......r####",
					 "####.r......r.###",
					 "###..r..rr..r..##",
					 "###............##",
					 "####....qr....###",
					 "######......#####",
					 "#################"],
					4,
					"CriticalHit",
					"You have pushed through some fierce resistance, and are glad to have broken through the anthill.  What's next?  You can't say.  You press on, undeterred."));

maps.push(new Map("Level 11",
					["###########",
					 "#♥♦....####",
					 "#♣♠....####",
					 "#####..####",
					 "#####..####",
					 "#####..####",
					 "###gg..gg##",
					 "###g....g##",
					 "####....###",
					 "###g....g##",
					 "###gg..gg##",
					 "###########"],
					4,
					"Autobuyer Protection",
					"Goblins.  Nasty little creatures that put up a fierce resistance.  Good thing your swords are sharper than theirs."));

maps.push(new Map("Level 12",
					["###########",
					 "#♥♦....####",
					 "#♣♠....####",
					 "#####..####",
					 "##........#",
					 "##.######.#",
					 "##...gg...#",
					 "#####..####",
					 "###gg..gg##",
					 "###g....g##",
					 "####....###",
					 "##.g....g.#",
					 "##.gg..gg.#",
					 "###########"],
					4,
					"Challenge LowDamage",
					"You have a feeling these warrens will only get larger and more dangerous.  How deep are these caves?"));

maps.push(new Map("Level 13",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.##.#.####",
					 "#####........####",
					 "####...#ww#...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "######......#####",
					 "###..g.w..w.g..##",
					 "###..gg....gg..##",
					 "#################"],
					4,
					"Autobuyer CriticalHit",
					"Not the most inventive creatures, goblins.  You're starting to notice a pattern in their caves."));

maps.push(new Map("Level 14",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.##.#.####",
					 "#####........####",
					 "####...#ww#...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "######......#####",
					 "####.g......g.###",
					 "####.gg....gg.###",
					 "#######....######",
					 "####...wggw...###",
					 "####..........###",
					 "#################"],
					4,
					"FasterTicks",
					"These wargs are fierce, capable of getting around your defences and difficult to pin down."));

maps.push(new Map("Level 15",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.##.#.####",
					 "#####........####",
					 "####...#ww#...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "######......#####",
					 "####.g......g.###",
					 "####.gg.w..gg.###",
					 "#######....######",
					 "####...wggw...###",
					 "####....ww....###",
					 "#################"],
					4,
					"Challenge LowHealth",
					"You've started to wonder if there is actually treasure at the bottom of these caves."));

maps.push(new Map("Level 16",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.__.#.####",
					 "#####........####",
					 "####..._ww_...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "###............##",
					 "##..#g......g#..#",
					 "##g..gg.w..gg..g#",
					 "#######....######",
					 "####...wggw...###",
					 "####....ww....###",
					 "#################"],
					4,
					"AI Nearest",
					"There are things that you can learn from the goblins.  You question your sanity - the goblins are barely sapient, after all."));

maps.push(new Map("Level 17",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.__.#.####",
					 "#####.._AA_..####",
					 "####..._ww_...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "###............##",
					 "##..#g......g#..#",
					 "##g..gg.w..gg..g#",
					 "#######....######",
					 "####...wggw...###",
					 "####..........###",
					 "#################"],
					4,
					"Haste",
					"Some of the goblins now sport poorly-made bows.  While they are barely a threat now, you expect them to be much more dangerous as you get deeper."));

maps.push(new Map("Level 18",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.__.#.####",
					 "#####.._AA_..####",
					 "####..._ww_...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "###............##",
					 "##..#g......g#..#",
					 "##g..gg.ww.gg..g#",
					 "#######....######",
					 "####...wggw...###",
					 "####....ww....##",
					 "#################"],
					4,
					"Challenge PlusTwoLevels",
					"You thought you found some gold (finally!) on one of the goblin archers, but it was actually just a fast-food wrapper."));

maps.push(new Map("Level 19",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.__.#.####",
					 "#####.._AA_..####",
					 "####..._AA_...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "###............##",
					 "##..#g......g#..#",
					 "##g..gg.ww.gg..g#",
					 "#######....######",
					 "####...wggw...###",
					 "####....ww....###",
					 "#################"],
					4,
					"Autobuyer Haste",
					"It's a good thing you're so dedicated to seeing this through, or you might have given up by now."));

maps.push(new Map("Level 20",
					["#################",
					 "#♥♦.......#######",
					 "#♣♠.......#######",
					 "########..#######",
					 "#####........####",
					 "#####.#.__.#.####",
					 "#####.._AA_..####",
					 "####..._AA_...###",
					 "####.gg....gg.###",
					 "#####g..ww..g####",
					 "###............##",
					 "##..#g......g#..#",
					 "##g.....h......g#",
					 "###g###....###g##",
					 "#####..wggw..####",
					 "####..........###",
					 "#################"],
					4,
					"CriticalDamage",
					"The hobgoblin does not go down easy.  It's worrying that most of what you've encountered has shown up later in a stronger form.  You press on, undeterred."));

maps.push(new Map("Level 21",
					["######################",
					 "#♥♦.......############",
					 "#♣♠.......#####.....##",
					 "########.........gw.##",
					 "########........GGA.##",
					 "#.....##.........gw.##",
					 "#.wg......#####.....##",
					 "#.AGG.....############",
					 "#.wg......############",
					 "#.....##..############",
					 "########..############",
					 "########..############",
					 "########..############",
					 "########...###########",
					 "########...###########",
					 "#######.....##########",
					 "#######..G..##########",
					 "#######.gGg.##########",
					 "#######.wAw.##########",
					 "#######.....##########",
					 "######################"],
					4,
					"Block",
					"The goblins are now fighting alongside golems, clearly made by more clever hands than theirs.  Their coordination too speaks of a higher intelligence."));

maps.push(new Map("Level 22",
					["######################",
					 "#♥♦..................#",
					 "#♣♠..................#",
					 "#..###_###..###_###..#",
					 "#..###A###..###A###..#",
					 "#..###.###.g###.###..#",
					 "#.._A...##wg##...A_..#",
					 "#..###..##ww##..###..#",
					 "#..####.######.####..#",
					 "#..####.######.####..#",
					 "#.....GG.####.GG.....#",
					 "#.....GG.####.GG.....#",
					 "#..####.######.####..#",
					 "#..####.######.####..#",
					 "#..###..##ww##..###..#",
					 "#.._A...##wg##...A_..#",
					 "#..###.###..###.###..#",
					 "#..###A###..###A###..#",
					 "#..###_###..###_###..#",
					 "#....................#",
					 "#....................#",
					 "######################"],
					4,
					"Regeneration",
					"You've clearly entered some kind of constructed facility.  Who could be the cause of this?"));

maps.push(new Map("Level 23",
					["#######################",
					 "#♥♦...................#",
					 "#♣♠...................#",
					 "#...Gww....G......G...#",
					 "#...w..w..............#",
					 "#...w.gw..............#",
					 "#....wwG...G...G......#",
					 "#.....................#",
					 "#.....................#",
					 "#.....................#",
					 "#...G..G...G...G..G...#",
					 "#.....................#",
					 "#.....................#",
					 "#.....................#",
					 "#......G...G...G......#",
					 "#.....................#",
					 "#.....................#",
					 "#...G......G......G...#",
					 "#.....................#",
					 "#.....................#",
					 "#######################"],
					6,
					"Challenge Accuracy",
					"You've clearly entered some kind of constructed facility.  Who could be the cause of this?"));

maps.push(new Map("Level 24",
					["#######################",
					 "#♥♦..z.z.z.z.z.z.z.z.z#",
					 "#♣♠.z.z.z.z.z.z.z.z.z.#",
					 "####################.z#",
					 "####################z.#",
					 "#..z.z.z.z.z.z.z.z.z.z#",
					 "#.z.z.z.z.z.z.z.z.z.z.#",
					 "#z.####################",
					 "#.z####################",
					 "#z.z.z.z.z.z.z.z.z.z.z#",
					 "#.z.z.z.z.z.z.z.z.z.z.#",
					 "####################.z#",
					 "####################z.#",
					 "#..z.z.z.z.z.z.z.z.z.z#",
					 "#.z.z.z.z.z.z.z.z.z.z.#",
					 "#z.####################",
					 "#.z####################",
					 "#..z.z.z.z.z.z.z.z.z..#",
					 "#.z.z.z.z.z.z.z.z.z...#",
					 "#######################"],
					1,
					"Bleed",
					"It seems that the creator of this facility is a necromancer.  You wonder what other foul magics they might employ."));

maps.push(new Map("Level 25",
					["#######################",
					 "#♥♦.........zzGzz#.zzz#",
					 "#♣♠.........zzzzz#.zGz#",
					 "#..#################zz#",
					 "#..#........zzz..#....#",
					 "#..#.......zzGzz.#....#",
					 "#...........zzz..#....#",
					 "#.........#......#....#",
					 "#..#......#......#....#",
					 "#..###########..####..#",
					 "#..#zzz...#......#zzz.#",
					 "#..#.Gzz.........#zGz.#",
					 "#..#zzz...........zzz.#",
					 "#..#################..#",
					 "#..#......#zzz........#",
					 "#.........#zGzz.......#",
					 "########..#zzzzz......#",
					 "#.zzz.....#zGzz.......#",
					 "#.zGzz....#zzz........#",
					 "#######################"],
					4,
					"Challenge Criticality",
					"Though the zombies individually are no match for you, they are a powerful force when massed, and the golems serve as their champions."));

maps.push(new Map("Level 26",
					["#######################",
					 "#♥♦..z.G.....G.....G..#",
					 "#♣♠..z##zzz.#########.#",
					 "#....z#####......G###.#",
					 "#...zz##Gz#.##G.#.....#",
					 "#zzzzR##..#.....#.#####",
					 "#.###.......#####...G.#",
					 "#.G.####..#.....##.#..#",
					 "###.zzz#Gz#####G...#.##",
					 "#...##.####.G.#.####.G#",
					 "#.G..............G....#",
					 "#######################"],
					4,
					"Roles",
					"What a frustrating creature, attacking you before retreating behind the golems.  It's a good thing you're faster than it is."));

maps.push(new Map("Level 27",
					["#######################",
					 "#♥♦.............#....##",
					 "#♣♠......#....z.#..R..#",
					 "#........#......#.....#",
					 "#........#......#.....#",
					 "#..z....R.......#.....#",
					 "#..########....R......#",
					 "#...........########..#",
					 "#...#.......z.........#",
					 "#...#.z.......#.......#",
					 "#...#.#######.#...z...#",
					 "#...#.........#.......#",
					 "#...#R.....z..#.#####.#",
					 "#...#.........#.......#",
					 "#.z...........#..R....#",
					 "#.###########.#.......#",
					 "#.............#.......#",
					 "#..R....z.....#....z..#",
					 "##...................##",
					 "#######################"],
					4,
					"Challenge Restless",
					"The revenants play a clever game: force you to attack the one while the other regenerates."));

maps.push(new Map("Level 28",
					["#######################",
					 "#♥♦.......zzz.........#",
					 "#♣♠.......zzz.........#",
					 "#..########.########..#",
					 "#..########.########..#",
					 "#..########.########..#",
					 "#R.########R########.R#",
					 "#..########.########..#",
					 "#.....zz.......zz.....#",
					 "#.....zz.......zz.....#",
					 "#.....zz.......zz.....#",
					 "#..########.########..#",
					 "#..########.########..#",
					 "#..########.########..#",
					 "#..########.########..#",
					 "#R.########R########.R#",
					 "#..########.########..#",
					 "#.........zzz.........#",
					 "#.........z.z.........#",
					 "#######################"],
					4,
					"Autobuyer Bleed",
					"It's hard to believe that the revenants occur naturally here, even moreso than any of the other creatures here.  Could someone have raised them intentionally?"));

maps.push(new Map("Level 29",
					["#######################",
					 "#♥♦..#...z...R.#.z...z#",
					 "#♣♠..#.zz..z.z.#..z...#",
					 "#...z#...z.....#.z...z#",
					 "#.z..#....#R.z.#...z..#",
					 "#..z.#z.z.#z...#z..z..#",
					 "#...R#....#...z#.....z#",
					 "#z...#...z#..z.#..z..z#",
					 "#...z#z...#z...#R.....#",
					 "#z...z....#....z.z..z.#",
					 "#.z.....R.#.z..z....z.#",
					 "#..z..z..z#..z.....z.z#",
					 "#######################"],
					4,
					"Autobuyer Block",
					"The density of the undead leads you to believe you're closing in on their source."));

maps.push(new Map("Level 30",
					["#######################",
					 "#♥♦..................R#",
					 "#♣♠...................#",
					 "#.._________________..#",
					 "#.._..............R_..#",
					 "#.._..............._..#",
					 "#.._...._________.._..#",
					 "#.._............_.._..#",
					 "#.._.._........._.._..#",
					 "#.._.._.._____.._.._..#",
					 "#.._.._.._n....._.._..#",
					 "#.._.._.._____.._.._..#",
					 "#.._.._........._.._..#",
					 "#.._.._........._.._..#",
					 "#.._..___________.._..#",
					 "#.._..............._..#",
					 "#.._R.................#",
					 "#.._______________....#",
					 "#.....................#",
					 "#R....................#",
					 "#######################"],
					12,
					"Challenge Respawning",
					"A summoner is a potent threat, much more dangerous than many of the other creatures in these caverns.  Dead now, though.  You might have thought that the necromancer was the creator of these caves, but you see a path leading to deeper, more natural caverns.  You press on, undeterred."));

maps.push(new Map("Level 31",
					["#######################",
					 "#♥♦...................#",
					 "#♣♠...................#",
					 "#_________..._________#",
					 "#......II_..._II......#",
					 "#.......I_..._I.......#",
					 "#.._....._R.R_....._..#",
					 "#.._....._..._....._..#",
					 "#.._..c.._..._..c.._..#",
					 "#.._....._R.R_....._..#",
					 "#.._....I_..._I...._..#",
					 "#.._______..._______..#",
					 "#.....................#",
					 "#.....................#",
					 "#######################"],
					5,
					"Mana",
					"The walls of this place are markedly different from the floor before.  Are you even in the same dungeon?"));

maps.push(new Map("Level 32",
					["###################",
					 "#♥♦.._.....cI.....#",
					 "#♣♠..._....I......#",
					 "#......_I.........#",
					 "#......._I........#",
					 "#_..._..._I.......#",
					 "#._......._I......#",
					 "#.._......._......#",
					 "#..I_....R.._.....#",
					 "#...I_..R_..._....#",
					 "#....I_...........#",
					 "#cI...I_..........#",
					 "#I......_.........#",
					 "#........_..._I...#",
					 "#............ICI..#",
					 "#.............I...#",
					 "#.................#",
					 "#.................#",
					 "###################"],
					5,
					"Spell Heal",
					"You're learning strange magics from these cultists.  You need them to survive, so hopefully they're not actually powered by taking the love out of the world."));

maps.push(new Map("Level 33",
					["###################",
					 "#♥♦........########",
					 "#♣♠........########",
					 "#..........########",
					 "########...########",
					 "########...########",
					 "########.W.########",
					 "########.I.########",
					 "#.....I.....I.....#",
					 "#.cW...I...I...Wc.#",
					 "#.......I.I.......#",
					 "########.I.########",
					 "########...########",
					 "########...########",
					 "########...########",
					 "########.W.########",
					 "########.C.########",
					 "########...########",
					 "###################"],
					3,
					"ManaRegeneration",
					"The cultists have powerful creatures under their command."));

maps.push(new Map("Level 34",
					["#####",
					 "#♠♦.#",
					 "#♣♥.#",
					 "##.##",
					 "##W##",
					 "##W##",
					 "##W##",
					 "##W##",
					 "##W##",
					 "##W##",
					 "##.##",
					 "##.##",
					 "#I.I#",
					 "#c.c#",
					 "#.c.#",
					 "#####"],
					1,
					"Challenge Quickly",
					"Their creatures cannot hold you back.  You're determined to get to the bottom of this."));

maps.push(new Map("Level 35",
					["###################",
					 "#♥♦........########",
					 "#♣♠........########",
					 "#..........########",
					 "########...########",
					 "######I_..._I######",
					 "#####I.I...I.I#####",
					 "#####_I_.I._I_#####",
					 "#....I.I_._I.I....#",
					 "#.c...I.I.I.I...c.#",
					 "#....I.I_._I.I....#",
					 "#####_I_.I._I_#####",
					 "#####I..I.I..I#####",
					 "######I_..._I######",
					 "########...########",
					 "########...########",
					 "########.C.########",
					 "########...########",
					 "###################"],
					3,
					"FasterTicks",
					"While the statues were merely an annoyance before, now they pose a serious threat.  Unfortunately, you don't seem to have packed warm coats."));

maps.push(new Map("END",
					["#####",
					 "#♥2q#",
					 "#♣4h#",
					 "#####"],
					3,
					"",
					""));