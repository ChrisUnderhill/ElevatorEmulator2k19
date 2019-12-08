/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
document.addEventListener('deviceready', function() {
   
    (function(){Math.clamp=function(a,b,c){return Math.max(b,Math.min(c,a));}})();

    Array.prototype.remove = function() {
        var what, a = arguments, L = a.length, ax;
        while (L && this.length) {
            what = a[--L];
            while ((ax = this.indexOf(what)) !== -1) {
                this.splice(ax, 1);
            }
        }
        return this;
    };
    var zoom = 2.5;

    var config = {
        type: Phaser.WEBGL,
        parent: 'game',
        width: 800 /zoom,
        height: 600 /zoom,
        pixelArt: true,
        zoom: zoom,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 }
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    var game = new Phaser.Game(config);

    var people = [];
    var officeBounds = {};
    var THIS;
    var lifts;
    var superLift;

    var frameCounter = 0;

    var enableObstacleCollide = true;

    function constructRando(x, y) {
        return THIS.add.sprite(x, y, "peeps", Math.floor(Math.random() * 8 * 4));
    }

    function preload ()
    {
        this.load.audio("background", "background.mp3");
        this.load.image("office", "hac-all.png");
        this.load.spritesheet("lift", "hac-lift.png", { frameWidth: 30, frameHeight: 47 });
        this.load.spritesheet("peeps", "hac.png", { frameWidth: 10, frameHeight: 27 });
    }

    function pickupPeople (lift, people, isAI=false){
        if (lift.state.capacity > 0){
            const res = people.filter(el => el.floor === lift.state.floor);
            if (res.length > 0){
                lift.isAnimating = true;
                res.forEach((el, index) => {
                    if (lift.state.capacity > 0) {
                        var p = el;
                        people = people.remove(el);
                        p.art.tweens = [];
                        if (! isAI) {
                            movePersonTo(
                                locateFloor(lift.state.floor, lift.state.shaft, officeBounds),
                                200,
                                p.art,
                                THIS,
                                easing = 'Linear.easeIn',
                                null,
                                delay = 0,
                                onComplete = () => {
                                    lift.isAnimating = false;
                                    p.annotation.destroy();
                                }
                            );
                        }

                        lift.peopleInside.push(p);
                        lift.state.capacity -= 1;
                    }
                })
            }
        }
    }

    function dropoffPeople (lift){
        const res = lift.peopleInside.filter(el => el.desiredFloor === lift.state.floor);
        if (res.length > 0) {
            res.forEach((el, index) => {
                var p = el;
                lift.peopleInside = lift.peopleInside.remove(el);
                p.art.tweens = [];
                complete = () =>{ p.art.destroy()};
                movePersonTo(locateFloor(lift.state.floor, 10, officeBounds, false), 1000, p.art, THIS, easing = 'Linear.easeOut', null, delay = index * 100, onComplete=complete);
                lift.state.capacity += 1;
                lift.state.score += 1;
                THIS.sound.rate *= 1.01;
                THIS.sound.rate = Math.min(THIS.sound.rate, 2);
            })
        }
    }

    function moveLiftTo (location, duration, item, THIS, easing = 'Sine', onComplete = null, isPlayer = true )
    {
        if (item.tweens.length > 0) {
            easing = easing.concat(easing, '.easeOut')
        } else {
            easing = easing.concat(easing, '.easeInOut')
        }

        if (! item.isAnimating) {
            var tween = THIS.tweens.add({
                targets: [item].concat(item.peopleInside.map(el => el.art)),
                props: {
                    x: {value: location.x, duration: Math.max(duration / 10, 100), ease: 'Bounce.easeInOut'},
                    y: {value: location.y, duration: duration, ease: easing}
                },
                onComplete: (onComplete !== null ? onComplete : function () {
                        item.tweens.remove(tween);
                        if (item.tweens.length === 0) {
                            dropoffPeople(item, people);
                            pickupPeople(item, people);
                            if (isPlayer){
                                console.log("IS PLAYER")
                            }
                        }
                    }
                )
            });
            item.tweens.push(tween);
        }

    }

    function movePersonTo (location, duration, item, THIS, easing = 'Linear.easeInOut', following = null, delay = 0, onComplete = null )
    {
        item.isAnimating = true;
        var tween = THIS.tweens.add({
            targets: item,
            props: {
                x: { value: location.x, duration: duration, ease: easing },
                y: { value: location.y, duration: duration, ease: easing }
            },
            delay: delay,
            onComplete: onComplete
        });


        item.tweens.push(tween);
    }

    function locateFloor(floor, shaft, officeBounds, clamp = true) {
        if (clamp) {
            floor = Math.clamp(floor, 0, officeBounds.numFloors);
            shaft = Math.clamp(shaft, 0, officeBounds.numShafts);
        }

        var x = officeBounds.x[0] + officeBounds.xstep * shaft;
        var y = officeBounds.y[1] - (officeBounds.ystep * floor);
        return {x: x, y: y}
    }

    function createPersonOnFloor(floor, desiredFloor, people){
        let personWidth = 10;

        const res = people.filter(el => el.floor === floor);
        var person1loc = locateFloor(floor,5 + (res.length + 1), officeBounds, clamp = false);
        var person1Art = constructRando(0, 5);
        THIS.physics.add.existing(person1Art);
        var annotation = THIS.add.text(-5, -30, desiredFloor, { fontFamily: "'Roboto'" });
        var group = THIS.add.container(person1loc.x, person1loc.y);
        group.add(person1Art);
        group.add(annotation);
        people.push({
            floor: floor,
            desiredFloor: desiredFloor,
            isWaiting: true,
            isInLift: false,
            art: group,
            annotation: annotation
        })
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function update() {
        desiredLocations.setText(
            "SCORE: " + superLift.state.score + "\n" +
                "Enemy Scores: " + lifts.map((el) => el.state.score) + " = " + lifts.map((el) => el.state.score).reduce((x, y) => x + y, 0 ) + "\n" +
                "Target Locations: " +
            superLift.peopleInside
                .map(v => v.desiredFloor)
                .reduce((x, y) => x + "  " + y, "")
        );

        frameCounter += 1;
        var interestingFloors = people.map(el => el.floor);

        var durationPerFloor = 600;
        lifts.forEach( async (lift, index) => {
            if (lift.state.targetFloor < 0) {
                if (lift.peopleInside.length > 0 ){
                    lift.state.targetFloor = lift.peopleInside[0].desiredFloor;
                } else {
                    lift.state.targetFloor = interestingFloors.pop();
                }


                while (lift.state.targetFloor === undefined || lift.state.targetFloor === lift.state.floor){
                    lift.state.targetFloor = Math.round(Math.random() * officeBounds.numFloors);
                }
                var duration = durationPerFloor * Math.abs(lift.state.targetFloor - lift.state.floor);

                var complete = () => {
                    lift.state.floor = lift.state.targetFloor;
                    dropoffPeople(lift, people);
                    pickupPeople(lift, people);
                    lift.state.targetFloor = -1;
                }
                while (lift.isAnimating){
                    await sleep(20);
                }
                moveLiftTo(locateFloor(lift.state.targetFloor, lift.state.shaft,officeBounds), duration, lift, THIS, easing='Linear', onComplete = complete)
            }

            }
        ) //End forEach

        if (Math.random() > 0.95){
            var f = Math.floor(Math.random()*10);
            var y = Math.floor(Math.random()*10);
            while (y===f){
                y = Math.floor(Math.random()*10);
            }
            createPersonOnFloor(f, y, people)
        }

        if (frameCounter % 30 == 0){
            superLift.tweens = [];
            enableObstacleCollide = true;
        }

    }

    function findClosestFloor(yPos, officeBounds){
        var floor = Math.round((officeBounds.y[1] - yPos)/officeBounds.ystep);
        //console.log(floor);
        return floor;
    }

    function resize() {
        var canvas = game.canvas, width = window.innerWidth, height = window.innerHeight;
        var wratio = width / height, ratio = canvas.width / canvas.height;
     
        if (wratio < ratio) {
            canvas.style.width = width + "px";
            canvas.style.height = (width / ratio) + "px";
        } else {
            canvas.style.width = (height * ratio) + "px";
            canvas.style.height = height + "px";
        }
    }

    function create ()
    {
        THIS = this;

        window.addEventListener('resize', resize);
        resize();

        this.sound.add("background");
        this.sound.play("background", {loop: true});
        THIS.sound.rate = 0.5;





        office = this.add.image(0, 0, "office");

        officeBounds = {
            x: [144 - 1000/2 + 30/2 + 2, 276 - 1000/2 + 30/2 + 2],
            y: [153 - 600/2 - 47/2 + 7, 553 - 600/2 - 47/2 + 7],
            numShafts: 4,
            numFloors:10
        };

        officeBounds.xstep = (officeBounds.x[1] - officeBounds.x[0]) / officeBounds.numShafts;
        officeBounds.ystep = (officeBounds.y[1] - officeBounds.y[0]) / officeBounds.numFloors;
        var liftTargetState = {floor: 5, shaft: 3, capacity: 4};
        var liftTargetPos = locateFloor(liftTargetState.floor, liftTargetState.shaft, officeBounds);(liftTargetState.floor, liftTargetState.shaft, officeBounds);

        people = [];

        // var logo = this.physics.add.image(liftTargetPos.x, liftTargetPos.y, 'logo');
        superLift = this.add.sprite(liftTargetPos.x, liftTargetPos.y, "lift", 1);
        this.cameras.cameras[0].startFollow(superLift)



        //var logo = this.add.rectangle(100, 100, 100, 100, 0xffffff);
        this.physics.add.existing(superLift);
        superLift.isAnimating = false;
        superLift.tweens = [];
        superLift.state = liftTargetState;
        superLift.state.score = 0;
        superLift.peopleInside = [];



        lifts = [];

        for (i=0; i<officeBounds.numShafts; i++){
            var l = {};
            l.state = {floor: 1, shaft: i, capacity: 1, targetFloor: -1};

            l.pos = locateFloor(l.state.floor, l.state.shaft, officeBounds);

            l = this.add.sprite(l.pos.x, l.pos.y, "lift", 0);
            l.isAnimating = false;
            l.tweens = [];
            l.state = {floor: 1, shaft: i, capacity: 1, targetFloor: -1};
            l.peopleInside = [];
            l.state.score = 0;


            lifts.push(l);
        }
        liftCOLLIDERS = this.physics.add.group();

        enableObstacleCollide = true;
        // this.physics.collide(superLift, liftCOLLIDERS, function() {
        //     // do any collision stuff here
        //             }, function() {  if (enableObstacleCollide) {    return true;  }  return false;});


        lifts.forEach( lift => liftCOLLIDERS.add(lift)    )
        on_hit=(enemy,superlift)=> {
            if (enableObstacleCollide) {
                var y = 0;
                if (enemy.body.position.y -25 < superlift.body.position.y){
                    y = enemy.body.position.y + 80;
                } else{
                    y = enemy.body.position.y - 20;
                }
                //console.log("COLLIDE", enemy);
                enableObstacleCollide = false;
                moveLiftTo({x: locateFloor(1, superlift.state.shaft, officeBounds).x, y: y}, 100, superlift, THIS, 'Sine', onComplete=()=> {enableObstacleCollide=true;}
                );
                superlift.state.floor = findClosestFloor(y, officeBounds);
            }
        }
        this.physics.add.collider(lifts,superLift,on_hit,null,this);

        for (i=0; i<4; i++) {
            createPersonOnFloor(i+6, 5, people)
            // var person1loc = locateFloor(i+5,5,officeBounds);
            // var person1Art = this.add.circle( person1loc.x + officeBounds.xstep, person1loc.y, 10, Math.max(0x444444, 0xad96c1 * i % 0xffffff) );
            // this.physics.add.existing(person1Art);
            // people.push( {floor: i+5, desiredFloor: 5, isWaiting: true, isInLift: false, art: person1Art} )
        }
        for (i=0; i<2; i++) {
            createPersonOnFloor(i+7, 3, people)
        }
        createPersonOnFloor(6,2,people);
        createPersonOnFloor(6,1,people);

        desiredLocations = this.add.text(0, 0, "", { fontFamily: "Roboto", fontColor: "#333" });
        desiredLocations.setScrollFactor(0);


        this.input.keyboard.on("keydown", function(e) {
            if (superLift.isAnimating===false) {
                var duration = 200;

                if (e.key == "ArrowDown") {
                    superLift.state.floor -= 1;
                } else if (e.key == "ArrowUp") {
                    superLift.state.floor += 1;
                } else if (e.key == "ArrowLeft") {
                    superLift.state.shaft -= 1;
                } else if (e.key == "ArrowRight") {
                    superLift.state.shaft += 1;
                }
                superLift.state.shaft = Math.clamp(superLift.state.shaft, 0, officeBounds.numShafts -1);
                superLift.state.floor = Math.clamp(superLift.state.floor, 0, officeBounds.numFloors -1);
                moveLiftTo(locateFloor(superLift.state.floor, superLift.state.shaft, officeBounds), duration, superLift, THIS);
            }
        })



        // logo.setVelocity(0, 0);
        // logo.setBounce(1, 1);
        // logo.setCollideWorldBounds(true);

        //emitter.startFollow(logo);
    }  
});