console.log("Loading maps.js")

class Map {
	constructor(mapName, layout, creatures, vision, reward, conquerMessage){
		this.mapName = mapName;
		this.layout = layout;
		this.creatures = creatures;
		this.vision = vision;
		this.reward = reward;
		this.conquerMessage = conquerMessage;
		this.conquered = false;
		this.instantiated = false;
		this.enemies = [];
		this.map = null;
		this.nodesWithCreatures = [];
		this.mapNodes = [];
	}

	instantiate(player_units){
		if (this.instantiated) return;
		this.instantiated = true;
		this.map = this.layout.map((row, y) => {
			row = row.split("");
			row = row.map((cell, x) => {
				if ("#.".includes(cell)) return cell;
				if ("1234".includes(cell)){
					if (player_units.length >= cell){
						player_units[+cell - 1].x = x;
						player_units[+cell - 1].y = y;
					}
					return ".";
				}
				let enemy = this.creatures[cell];
				enemy.unit.level = enemy.level;
				let enemyUnit = new Unit(false, enemy.name, enemy.unit, enemy.ai || "simple");
				enemyUnit.x = x;
				enemyUnit.y = y;
				enemyUnit.xp = enemy.unit.xp;
				enemyUnit.name = enemy.unit.name;
				enemyUnit.character = cell;
				enemyUnit.refillHealth();
				this.enemies.push(enemyUnit);
				return ".";
			});
			row = row.map(c => [c, false]);
			return row;
		});
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
			applyReward(this.reward);
			displayMessage(this.conquerMessage);
		}
		this.conquered = true;
		this.uninstantiate();
	}

	uninstantiate(){
		this.instantiated = false;
		this.map = null;
		this.enemies = [];
		this.nodesWithCreatures = [];
		this.mapNodes = [];
	}

	draw() {
		if (!this.instantiated) return;
		this.mapNodes = [];
		document.querySelector("#map-title").innerHTML = this.mapName;
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
		});
		this.nodesWithCreatures = [];
		player_units.forEach((unit, i) => {
			if (unit.dead) return;
			let node = this.mapNodes[unit.y][unit.x];
			node.innerHTML = unit.character;
			this.nodesWithCreatures.push(node);
		});
		this.enemies.forEach(enemy => {
			if (enemy.dead) return;
			let node = this.mapNodes[enemy.y][enemy.x];
			node.innerHTML = "&nbsp;" + enemy.character;
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
			if (this.map[yCoord][xCoord][0] != ".") return false;
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

	isEmpty(x, y){
		return this.map[y] && this.map[y][x] && this.map[y][x][0] == "." && !this.enemies.some(enemy => enemy.x == x && enemy.y == y && !enemy.dead) && !playerUnits.some(unit => unit.x == x && unit.y == y && !unit.dead && unit.active);
	}

	highlight(highlightColour, x, y){
		if (!this.mapNodes[0]) return;
		[...document.querySelectorAll(`.highlight-${highlightColour}`)].forEach(node => node.classList.remove(`highlight-${highlightColour}`));
		this.mapNodes[y][x].classList.add(`highlight-${highlightColour}`);
	}

	noHighlight(highlightColour){
		if (!this.mapNodes[0]) return;
		[...document.querySelectorAll(`.highlight-${highlightColour}`)].forEach(node => node.classList.remove(`highlight-${highlightColour}`));
	}
}

let maps = [];

const classMapping = {
	"#": ["wall", "Solid Rock"],
	".": ["tunnel", "Open Tunnel"],
};

/*
*	L	XP	CUM
*	1	5	5
*	2	11	16
*	3	18	34
*	4	26	60
*	5	35	95
*	6	45	140
*/

maps.push(new Map("Level 1",
				  ["###########",
				   "#12##...###",
				   "#34.......#",
				   "##.######a#",
				   "##.##...#.#",
				   "##....a.#.#",
				   "#####a..#.#",
				   "#####.###.#",
				   "##....##a.#",
				   "###.a.##.##",
				   "###..###..#",
				   "###########"],
				   {
					   "a": {unit: creatures.antWorker, level: 2},
				   },
				   4,
				   "ToHit",
				   "Stepping over the broken bodies of your fallen foes... who are you kidding?  It's embarrassing that you took so long to beat up some ants.  You travel deeper into the cave."));

maps.push(new Map("Level 2",
					["###############",
					 "#12.........###",
					 "#34#######....#",
					 "##...####a...a#",
					 "##....a##a...##",
					 "###..a#####..##",
					 "#####...###.###",
					 "######..##....#",
					 "#a......###...#",
					 "##...#######..#",
					 "##a.a##...###.#",
					 "##...#a..a##..#",
					 "###.###...##..#",
					 "###.###..###.a#",
					 "###......######",
					 "###############"],
					{
						"a": {unit: creatures.antWorker, level: 3},
					},
					4,
					"Dodge",
					"There are far more of these creatures than you had expected.  You press on."));

maps.push(new Map("Level 3",
					["#################",
					 "#12.....a...#####",
					 "#34.######.###r##",
					 "#.......##.....##",
					 "#.#.###a#####a.##",
					 "#.#.###.#..##..##",
					 "#.#.###.ar.##.###",
					 "#.#a####...##.###",
					 "#.#..####.###.###",
					 "#a#....##.......#",
					 "#.##..##.a#####.#",
					 "#.###.##.######.#",
					 "#.###a....##r...#",
					 "#.###.###.###..##",
					 "#..#..###.##....#",
					 "##...####.##..r##",
					 "##...r........###",
					 "#################"],
					{
						"a": {unit: creatures.antWorker, level: 4},
						"r": {unit: creatures.antWarrior, level: 2},
					},
					4,
					"Block",
					"With each new level, the creatures seem to be getting stronger.  Surely there are great treasures to be discovered below!  You emerge into a larger cavern."));

maps.push(new Map("Level 4",
					["#################",
					 "#12...#.....#####",
					 "#34....aa..###.##",
					 "#......#....a..##",
					 "#..#...a..a....##",
					 "#....a...##....##",
					 "##.a........r.###",
					 "#..#..#..r...####",
					 "#...r.........###",
					 "#.#....##.......#",
					 "#.##............#",
					 "#r###.##..r.....#",
					 "#####rr.........#",
					 "#####...#...#..##",
					 "####....#.#...r.#",
					 "##...#.........##",
					 "##a.......r...###",
					 "#################"],
					 {
						 "a": {unit: creatures.antWorker, level: 5},
						 "r": {unit: creatures.antWarrior, level: 3},
					 },
					 5,
					 "autoUnselect",
					 "The ants are getting larger and fiercer.  But you are getting stronger as well, and feel confident you can complete this challenge."));

maps.push(new Map("Level 5",
					["#################",
					 "#12.........#####",
					 "#34.........#####",
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
					 {
						 "a": {unit: creatures.antWorker, level: 6},
						 "r": {unit: creatures.antWarrior, level: 4},
					 },
					 5,
					 "AutoBuyer",
					 "You continue cautiously into the dark.  Surely it won't be long before you manage to conquer this anthill."));
					 
maps.push(new Map("Level 6",
					["#################",
					 "#12....a...a..###",
					 "#34..........a.##",
					 "#......a..a...###",
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
					 "####.r..rr..r.###",
					 "#####........####",
					 "#######.qr.######",
					 "#################"],
					 {
						 "a": {unit: creatures.antWorker, level: 7},
						 "r": {unit: creatures.antWarrior, level: 5},
						 "q": {unit: creatures.antQueen, level: 1},
					 },
					 4,
					 "CriticalHit",
					 "Hopefully conquering the anthill will mean that your way is clear from here on out."));