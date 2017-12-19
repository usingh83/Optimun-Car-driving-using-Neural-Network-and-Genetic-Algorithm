/***********************************************************************************
/* Create a new Phaser Game on window load
/***********************************************************************************/
var carColors = [0xff0000, 0x0000ff, 0xc0c0c0, 0x00f000, 0xffff00, 0x00ffff, 0x808000,0x008080, 0x800080,0x800000];

window.onload = function () {
	var game = new Phaser.Game(1280, 720, Phaser.CANVAS, 'game');
	
	game.state.add('Main', App.Main);
	game.state.start('Main');
};

/***********************************************************************************
/* Main program
/***********************************************************************************/

var App = {};

App.Main = function(game){
	this.STATE_INIT = 1;
	this.STATE_START = 2;
	this.STATE_PLAY = 3;
	this.STATE_GAMEOVER = 4;
	
	this.BARRIER_DISTANCE = 400;
}

App.Main.prototype = {
	preload : function(){
		this.game.load.image('imgRoad', 'assets/img_road.png');
		this.game.load.spritesheet('imgCar', 'assets/img_car.png', 72, 36, 20);
		this.game.load.spritesheet('imgBar', 'assets/img_barrier.png', 90, 400, 2);
		this.game.load.spritesheet('imgButtons', 'assets/img_buttons.png', 110, 40, 3);
		
		this.game.load.image('imgTarget', 'assets/img_target.png');
		this.game.load.image('imgGround', 'assets/img_ground.png');				
		this.game.load.image('imgfloor', 'assets/img_floor.png');
		
		this.load.bitmapFont('fnt_chars_black', 'assets/fnt_chars_black.png', 'assets/fnt_chars_black.fnt');
		this.load.bitmapFont('fnt_digits_blue', 'assets/fnt_digits_blue.png', 'assets/fnt_digits_blue.fnt');
		this.load.bitmapFont('fnt_digits_green', 'assets/fnt_digits_green.png', 'assets/fnt_digits_green.fnt');
		this.load.bitmapFont('fnt_digits_red', 'assets/fnt_digits_red.png', 'assets/fnt_digits_red.fnt');
	},
	
	create : function(){
		// set scale mode to cover the entire screen
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignVertically = true;
		this.scale.pageAlignHorizontally = true;

		// set a blue color for the background of the stage
		this.game.stage.backgroundColor = "#9b9b9b";
		
		// keep game running if it loses the focus
		this.game.stage.disableVisibilityChange = true;
		
		// start the Phaser arcade physics engine
		this.game.physics.startSystem(Phaser.Physics.ARCADE);
		
		// create a new Genetic Algorithm with a population of 10 units which will be evolving by using 4 top units
		this.GA = new GeneticAlgorithm(10, 4);
		
		// create a CarGroup which contains a number of Car objects
		this.CarGroup = this.game.add.group();
		for (var i = 0; i < this.GA.max_units; i++){
			this.CarGroup.add(new Car(this.game, 0, 0, i));
		}		
	
		// create a BarrierGroup which contains a number of Bar Groups
		// (each Barrier Group contains a top and bottom Bar object)
		this.BarrierGroup = this.game.add.group();		
		for (var i = 0; i < 10; i++){
			new BarGroup(this.game, this.BarrierGroup, i);
		}
		
		// create a Target Point sprite
		this.TargetPoint = this.game.add.sprite(0, 0, 'imgTarget');
		this.TargetPoint.anchor.setTo(0.5);
		// create a scrolling Ground object
		

		this.Ground = this.game.add.tileSprite(0, this.game.height-100, this.game.width, 100, 'imgGround');
		this.Ground.autoScroll(-200, 0);

		this.Ground = this.game.add.tileSprite(0, this.game.height-770, this.game.width, 100, 'imgfloor');
		this.Ground.autoScroll(-200, 0);

		// create a BitmapData image for drawing head-up display (HUD) on it
		this.bmdStatus = this.game.make.bitmapData(370, this.game.height);
		this.bmdStatus.addToWorld(this.game.width - this.bmdStatus.width, 0);
		
		// create text objects displayed in the HUD header
		//new Text(this.game, 1047, 10, "In1  In2  Out", "right", "fnt_chars_black"); // Input 1 | Input 2 | Output
		this.txtPopulationPrev = new Text(this.game, 1190, 10, "", "right", "fnt_chars_black"); // No. of the previous population
		this.txtPopulationCurr = new Text(this.game, 1270, 10, "", "right", "fnt_chars_black"); // No. of the current population
		
		// create text objects for each Car to show their info on the HUD
		this.txtStatusPrevGreen = [];	// array of green text objects to show info of top units from the previous population
		this.txtStatusPrevRed = [];		// array of red text objects to show info of weak units from the previous population
		this.txtStatusCurr = [];		// array of blue text objects to show info of all units from the current population
		
		for (var i=0; i<this.GA.max_units; i++){
			var y = 46 + i*50;
			
			new Text(this.game, 1110, y, "Fitness:\nScore:", "right", "fnt_chars_black")
			this.txtStatusPrevGreen.push(new Text(this.game, 1190, y, "", "right", "fnt_digits_green"));
			this.txtStatusPrevRed.push(new Text(this.game, 1190, y, "", "right", "fnt_digits_red"));
			this.txtStatusCurr.push(new Text(this.game, 1270, y, "", "right", "fnt_digits_blue"));
		}
		
		// create a text object displayed in the HUD footer to show info of the best unit ever born
		this.txtBestUnit = new Text(this.game, 1095, 580, "", "center", "fnt_chars_black");
		
		// create buttons
		this.btnRestart = this.game.add.button(10, 650, 'imgButtons', this.onRestartClick, this, 0, 0);
				
		// set initial App state
		this.state = this.STATE_INIT;
	},
	
	update : function(){		
		switch(this.state){
			case this.STATE_INIT: // init genetic algorithm
				this.GA.reset();
				this.GA.createPopulation();
				
				this.state = this.STATE_START;
				break;
				
			case this.STATE_START: // start/restart the game
				// update text objects
				this.txtPopulationPrev.text = "GEN "+(this.GA.iteration-1);
				this.txtPopulationCurr.text = "GEN "+(this.GA.iteration);
				
				this.txtBestUnit.text = 
					"The best unit was born in generation "+(this.GA.best_population)+":"+
					"\nFitness = "+this.GA.best_fitness.toFixed(2)+" / Score = " + this.GA.best_score;
				
				// reset score and distance
				this.score = 0;
				this.distance = 0;
				
				// reset barriers
				this.BarrierGroup.forEach(function(barrier){
					barrier.restart(700 + barrier.index * this.BARRIER_DISTANCE);
				}, this);
				
				// define pointer to the first barrier
				this.firstBarrier = this.BarrierGroup.getAt(0);
				
				// define pointer to the last barrier
				this.lastBarrier = this.BarrierGroup.getAt(this.BarrierGroup.length-1);
				
				// define pointer to the current target barrier
				this.targetBarrier = this.firstBarrier;
				
				// start a new population of Cars
				this.CarGroup.forEach(function(car){
					car.restart(this.GA.iteration);
					
					if (this.GA.Population[car.index].isWinner){
						this.txtStatusPrevGreen[car.index].text = car.fitness_prev.toFixed(2)+"\n" + car.score_prev;
						this.txtStatusPrevRed[car.index].text = "";
					} else {
						this.txtStatusPrevGreen[car.index].text = "";
						this.txtStatusPrevRed[car.index].text = car.fitness_prev.toFixed(2)+"\n" + car.score_prev;
					}
				}, this);
							
				this.state = this.STATE_PLAY;
				break;
				
			case this.STATE_PLAY: // play Car game by using genetic algorithm AI
				// update position of the target point
				this.TargetPoint.x = this.targetBarrier.getGapX();
				this.TargetPoint.y = this.targetBarrier.getGapY();
				
				var isNextTarget = false; // flag to know if we need to set the next target barrier
				
				this.CarGroup.forEachAlive(function(car){
					// calculate the current fitness and the score for this Car
					car.fitness_curr = this.distance - this.game.physics.arcade.distanceBetween(car, this.TargetPoint);
					car.score_curr = this.score;
					
					// check collision between a Car and the target barrier
					this.game.physics.arcade.collide(car, this.targetBarrier, this.onDeath, null, this);
					
					if (car.alive){
						// check if a Car passed through the gap of the target barrier
						if (car.x > this.TargetPoint.x) isNextTarget = true;
						
						// check if a Car flies out of vertical bounds
						if (car.y<0 || car.y>610) this.onDeath(car);
						
						// perform a proper action (flap yes/no) for this Car by activating its neural network
						this.GA.activateBrain(car, this.TargetPoint);
					}
				}, this);
				
				// if any Car passed through the current target barrier then set the next target barrier
				if (isNextTarget){
					this.score++;
					this.targetBarrier = this.getNextBarrier(this.targetBarrier.index);
				}
				
				// if the first barrier went out of the left bound then restart it on the right side
				if (this.firstBarrier.getWorldX() < -this.firstBarrier.width){
					this.firstBarrier.restart(this.lastBarrier.getWorldX() + this.BARRIER_DISTANCE);
					
					this.firstBarrier = this.getNextBarrier(this.firstBarrier.index);
					this.lastBarrier = this.getNextBarrier(this.lastBarrier.index);
				}
				
				// increase the travelled distance
				this.distance += Math.abs(this.firstBarrier.topBar.deltaX);
				
				this.drawStatus();				
				break;
				
			case this.STATE_GAMEOVER: // when all Cars are killed evolve the population
				this.GA.evolvePopulation();
				this.GA.iteration++;
					
				this.state = this.STATE_START;
				break;
		}
	},
	
	drawStatus : function(){
		//this.bmdStatus.fill(255, 255, 255); // clear bitmap data by filling it with a gray color
		this.bmdStatus.rect(0, 0, this.bmdStatus.width, 35); // draw the HUD header rect
			
		this.CarGroup.forEach(function(car){
			var y = 85 + car.index*50;
								
			this.bmdStatus.draw(car, 50, y-25); // draw Car's image
			this.bmdStatus.rect(0, y, this.bmdStatus.width, 2, "#888"); // draw line separator
			
			this.txtStatusCurr[car.index].setText(car.fitness_curr.toFixed(2)+"\n" + car.score_curr);
		}, this);
	},
	
	getNextBarrier : function(index){
		return this.BarrierGroup.getAt((index + 1) % this.BarrierGroup.length);
	},
	
	onDeath : function(car){
		this.GA.Population[car.index].fitness = car.fitness_curr;
		this.GA.Population[car.index].score = car.score_curr;
					
		car.death();
		if (this.CarGroup.countLiving() == 0) this.state = this.STATE_GAMEOVER;
	},
	
	onRestartClick : function(){
		this.state = this.STATE_INIT;
    },

	
	onPauseClick : function(){
		this.game.paused = true;
		this.btnPause.input.reset();
		this.sprPause.revive();
    },
	
	onResumeClick : function(){
		if (this.game.paused){
			this.game.paused = false;
			this.btnPause.input.enabled = true;
			this.sprPause.kill();
		}
    }
}

/***********************************************************************************
/* BarGroup Class extends Phaser.Group
/***********************************************************************************/	
	
var BarGroup = function(game, parent, index){
	Phaser.Group.call(this, game, parent);

	this.index = index;

	this.topBar = new Bar(this.game, 0); // create a top Bar object
	this.bottomBar = new Bar(this.game, 1); // create a bottom Bar object
	
	this.add(this.topBar); // add the top Bar to this group
	this.add(this.bottomBar); // add the bottom Bar to this group
};

BarGroup.prototype = Object.create(Phaser.Group.prototype);
BarGroup.prototype.constructor = BarGroup;

BarGroup.prototype.restart = function(x) {
	this.topBar.reset(0, 0);
	this.bottomBar.reset(0, this.topBar.height + 130);

	this.x = x;
	this.y = this.game.rnd.integerInRange(500-this.topBar.height, -300);

	this.setAll('body.velocity.x', -400);
};

BarGroup.prototype.getWorldX = function() {
	return this.topBar.world.x;
};

BarGroup.prototype.getGapX = function() {
	return this.bottomBar.world.x + this.bottomBar.width;
};

BarGroup.prototype.getGapY = function() {
	return this.bottomBar.world.y - 65;
};

/***********************************************************************************
/* Bar Class extends Phaser.Sprite
/***********************************************************************************/

var Bar = function(game, frame) {
	Phaser.Sprite.call(this, game, 0, 0, 'imgBar', frame);
	
	this.game.physics.arcade.enableBody(this);
	
	this.body.allowGravity = false;
	this.body.immovable = true;
};

Bar.prototype = Object.create(Phaser.Sprite.prototype);
Bar.prototype.constructor = Bar;

/***********************************************************************************
/* Car Class extends Phaser.Sprite
/***********************************************************************************/

var Car = function(game, x, y, index) {
	Phaser.Sprite.call(this, game, x, y, 'imgCar');
	   
	this.index = index;
	this.anchor.setTo(0.5);
	  
	// add flap animation and start to play it
	//this.tint=carColors[index];
	var i=index;
	this.animations.add('run', [i, i]);
	this.animations.play('run', 8, true);

	// enable physics on the Car
	this.game.physics.arcade.enableBody(this);
};

Car.prototype = Object.create(Phaser.Sprite.prototype);
Car.prototype.constructor = Car;

Car.prototype.restart = function(iteration){
	this.fitness_prev = (iteration == 1) ? 0 : this.fitness_curr;
	this.fitness_curr = 0;
	
	this.score_prev = (iteration == 1) ? 0: this.score_curr;
	this.score_curr = 0;
	
	this.alpha = 1;
	this.reset(150, 300 + this.index * 20);
};

Car.prototype.turnleft = function(){
	this.body.velocity.y = -300;
};


Car.prototype.turnright = function(){
	this.body.velocity.y = +300;
};
Car.prototype.death = function(){
	this.alpha = 0.5;
	this.kill();
};

/***********************************************************************************
/* Text Class extends Phaser.BitmapText
/***********************************************************************************/

var Text = function(game, x, y, text, align, font){
	Phaser.BitmapText.call(this, game, x, y, font, text, 16);
	
	this.align = align;
	
	if (align == "right") this.anchor.setTo(1, 0);
	else this.anchor.setTo(0.5);
	
	this.game.add.existing(this);
};

Text.prototype = Object.create(Phaser.BitmapText.prototype);
Text.prototype.constructor = Text;

