const GameWorld = new World();
const CollisionUtils = new CollisionDetection()

let CarStartingX = 500 + Math.cos(0) * 350;
let CarStartingY = 500 + Math.sin(0) * 350;

const DownKeys = [];
const CheckPoints = [];

const MousePos = new Vector2D(0, 0);
const MouseButtons = new Vector3D(0, 0, 0);

let NeuralNetworkGeneration = 1;
let NeuralNetworks = [];
let IsRunning = true;
let SceneType = "Train"; // LevelEditor, Train

document.addEventListener("mousemove", (e) => {

    MousePos.x = e.clientX;
    MousePos.y = e.clientY;

})

document.addEventListener("mousedown", (e) => {

    if (e.button == 0) {
        MouseButtons.x = 1;
    }
    if (e.button == 1) {
        MouseButtons.y = 1;
    }
    if (e.button == 2) {
        MouseButtons.z = 1;
    }

})

document.addEventListener("mouseup", (e) => {

    if (e.button == 0) {
        MouseButtons.x = 0;
    }
    if (e.button == 1) {
        MouseButtons.y = 0;
    }
    if (e.button == 2) {
        MouseButtons.z = 0;
    }

})

var Counter = 0;

if (SceneType == "Train") {

    // Traning Loop
    setInterval(function () {

        ctx.clearRect(0, 0, Canvas.width, Canvas.height);

        GameWorld.draw(ctx);

        if (!IsRunning) return

        if (NeuralNetworks.filter(nn => nn.disqualifyed == false).length == 0) {
            Counter = 9999999999999999
        }

        NeuralNetworks.forEach(nn => {

            let CarObject = nn.car;

            nn.act(ctx)

            CarObject.update();
            if (nn.disqualifyed) return
            CarObject.draw(ctx);
            CarObject.carUpdate(GameWorld);

            CheckPoints.forEach((point, i) => {

                let TempWorld = new World();
                TempWorld.add(CarObject);

                let Angle = point.z

                // make a raycast from each checkpoint
                let RayStart = new Vector2D(point.x - Math.cos(Angle) * 150, point.y - Math.sin(Angle) * 150);
                let RayEnd = new Vector2D(point.x + Math.cos(Angle) * 150, point.y + Math.sin(Angle) * 150);
                let Ray = CollisionUtils.rayCast(TempWorld, RayStart, RayEnd);

                // draw checkpoints
                if (i == nn.checkPoint) {
                    ctx.beginPath();
                    ctx.strokeStyle = "red";
                    ctx.moveTo(RayStart.x, RayStart.y);
                    ctx.lineTo(RayEnd.x, RayEnd.y);
                    ctx.stroke();
                }

                if (i == nn.checkPoint) {

                    if (Ray.hit) {
                        nn.checkPoint = i + 1;
                        if (nn.checkPoint == CheckPoints.length) {
                            nn.checkPoint = 0;
                        }
                        nn.score += 100;
                    }

                }

            });

            // check if the car has hit a wall
            let TempWorld = new World();
            TempWorld.add(CarObject);

            TrackInObject.lines.forEach(line => {

                CarObject.lines.forEach(carLine => {
                    let LineCheck = TempWorld.lineintersect(carLine, line);
                    if (LineCheck.hit) {
                        nn.score -= 10000;
                        nn.disqualifyed = true;
                    }
                });

            });

            TrackOutObject.lines.forEach(line => {

                CarObject.lines.forEach(carLine => {
                    let LineCheck = TempWorld.lineintersect(carLine, line);
                    if (LineCheck.hit  && !nn.disqualifyed) {
                        nn.disqualifyed = true;
                    }
                });

            });


        });

        Counter++;

    }, 1);

    let LastTrigger = Date.now();
    setInterval(function () {

        // wait 15 seconds before triggering the next generation
        // create 100 copies of the best neural network
        // then mutate them

        if (Counter < 120*30) return
        Counter = 0;

        let BestNN = NeuralNetworks[0];
        let SecondBestNN = NeuralNetworks[1];
        NeuralNetworks.forEach(nn => {
            if (nn.score > BestNN.score) {
                BestNN = nn;
            }
        });

        NeuralNetworks.forEach(nn => {
            if (nn.score > SecondBestNN.score && nn != BestNN) {
                SecondBestNN = nn;
            }
        });

        NeuralNetworks = [];

        let NewComp = new CompeativeNeuralNetwork(BestNN.nn.copy())
        NewComp.car.color = "green"
        NeuralNetworks.push(NewComp);

        for (let i = 0; i < 25; i++) {
            let ThisNN = BestNN.nn.copy();
            ThisNN.mutate(0.5);
            NeuralNetworks.push(new CompeativeNeuralNetwork(ThisNN));
        }
        for (let i = 0; i < 25; i++) {
            let ThisNN = SecondBestNN.nn.copy();
            ThisNN.mutate(0.5);
            NeuralNetworks.push(new CompeativeNeuralNetwork(ThisNN));
        }

        for (let i = 0; i < 50; i++) {
            let ThisNN = BestNN.nn.crossover(SecondBestNN.nn);
            ThisNN.mutate(0.1);
            NeuralNetworks.push(new CompeativeNeuralNetwork(ThisNN));
        }

        NeuralNetworkGeneration++;
        console.log("Prv Gen Top Score: " + BestNN.score)
        console.log("Generation: " + NeuralNetworkGeneration);


    }, 1)

}

var Points = [
    new LevelEditorPoint(500, 500, 0),
];

if (SceneType == "LevelEditor") {

    let SelectedPoint = null;
    let LastSelectedPoint = Points[0];
    let SelectedPointType = false;
    let SelectedPointSide = false;

    let PointVisualiser = new BasicSprite(0, 0, 10, 10, "green")

    setInterval(function () {

        ctx.clearRect(0, 0, Canvas.width, Canvas.height);

        Points.forEach((point, i) => {

            if (i == 0) {
                PointVisualiser.color = "blue"
            } else {
                PointVisualiser.color = "green"
            }

            PointVisualiser.x = point.x;
            PointVisualiser.y = point.y;
            PointVisualiser.update()
            PointVisualiser.draw(ctx);

            RoadHalfWidth = point.width / 2;

            InnerPointX = point.x + Math.cos(point.angle) * RoadHalfWidth;
            InnerPointY = point.y + Math.sin(point.angle) * RoadHalfWidth;

            OuterPointX = point.x - Math.cos(point.angle) * RoadHalfWidth;
            OuterPointY = point.y - Math.sin(point.angle) * RoadHalfWidth;

            PointVisualiser.color = "red"

            PointVisualiser.x = InnerPointX;
            PointVisualiser.y = InnerPointY;
            PointVisualiser.update()
            PointVisualiser.draw(ctx);

            PointVisualiser.x = OuterPointX;
            PointVisualiser.y = OuterPointY;
            PointVisualiser.update()
            PointVisualiser.draw(ctx);

            point.innerPoint.x = InnerPointX;
            point.innerPoint.y = InnerPointY;

            point.outerPoint.x = OuterPointX;
            point.outerPoint.y = OuterPointY;

        })

        for (let i = 0; i < Points.length; i++) {

            let Point1 = Points[i];
            let Point2 = Points[i + 1];

            if (i == Points.length - 1) {
                Point2 = Points[0];
            }

            let NewLine = new Line(Point1.innerPoint, Point2.innerPoint);
            NewLine.color = "white";
            NewLine.draw(ctx);

            NewLine = new Line(Point1.outerPoint, Point2.outerPoint);
            NewLine.color = "white";
            NewLine.draw(ctx);


        }

        if (SelectedPoint) {

            if (SelectedPointType == false) {
                SelectedPoint.x = MousePos.x - WorldCamera.x;
                SelectedPoint.y = MousePos.y - WorldCamera.y;
            }

            if (SelectedPointType == true) {
                let Angle = Math.atan2(MousePos.y - WorldCamera.y - SelectedPoint.y, MousePos.x - WorldCamera.x - SelectedPoint.x) + (SelectedPointSide ? Math.PI : 0);
                SelectedPoint.angle = Angle;
            }



        }

    })

    document.addEventListener("mousedown", function (event) {

        let MouseHoverPoints = Points.filter(point => {
            return (MousePos.x > (point.x + WorldCamera.x) - 5 && MousePos.x < (point.x + WorldCamera.x) + 5 && MousePos.y > (point.y + WorldCamera.y) - 5 && MousePos.y < (point.y + WorldCamera.y) + 5)
        })

        if (MouseHoverPoints.length > 0) {
            SelectedPoint = MouseHoverPoints[0];
            SelectedPointType = false;
            SelectedPointSide = false;
        }

        let MouseHoverInnerPoints = Points.filter(point => {
            return (MousePos.x > (point.innerPoint.x + WorldCamera.x) - 5 && MousePos.x < (point.innerPoint.x + WorldCamera.x) + 5 && MousePos.y > (point.innerPoint.y + WorldCamera.y) - 5 && MousePos.y < (point.innerPoint.y + WorldCamera.y) + 5)
        })

        if (MouseHoverInnerPoints.length > 0) {
            SelectedPoint = MouseHoverInnerPoints[0];
            SelectedPointType = true;
            SelectedPointSide = false;
        }

        let MouseHoverOuterPoints = Points.filter(point => {
            return (MousePos.x > (point.outerPoint.x + WorldCamera.x) - 5 && MousePos.x < (point.outerPoint.x + WorldCamera.x) + 5 && MousePos.y > (point.outerPoint.y + WorldCamera.y) - 5 && MousePos.y < (point.outerPoint.y + WorldCamera.y) + 5)
        })

        if (MouseHoverOuterPoints.length > 0) {
            SelectedPoint = MouseHoverOuterPoints[0];
            SelectedPointType = true;
            SelectedPointSide = true;
        }

    })

    document.addEventListener("mouseup", function (event) {
        LastSelectedPoint = SelectedPoint;
        SelectedPoint = null;
    })

    document.addEventListener("keydown", function (event) {
        if (event.key == "+" || event.key == "=") {
            let NewPoint = new LevelEditorPoint(MousePos.x - WorldCamera.x, MousePos.y - WorldCamera.y, 0);
            // set point to be infront of the last selected point in the array
            Points.splice(Points.indexOf(LastSelectedPoint) + 1, 0, NewPoint);

        }

        if (event.key == "Backspace") {
            Points.splice(Points.indexOf(LastSelectedPoint), 1);
        }
    });

}

document.addEventListener("keydown", function (event) {

    if (event.key == "ArrowUp") {
        WorldCamera.y += 10;
    }
    if (event.key == "ArrowDown") {
        WorldCamera.y -= 10;
    }
    if (event.key == "ArrowLeft") {
        WorldCamera.x += 10;
    }
    if (event.key == "ArrowRight") {
        WorldCamera.x -= 10;
    }

})

function MapToJSON() {
    let JSONMap = {
        "Points": Points.map(point => {
            return {
                "x": point.x,
                "y": point.y,
                "angle": point.angle,
                "innerPoint": {
                    "x": point.innerPoint.x,
                    "y": point.innerPoint.y
                },
                "outerPoint": {
                    "x": point.outerPoint.x,
                    "y": point.outerPoint.y
                }
            }
        })
    }

    console.log(JSON.stringify(JSONMap));
}

function JSONToMap(JSONMap) {
    Points = JSONMap.Points.map(point => {
        let NewPoint = new LevelEditorPoint(point.x, point.y, 0);
        NewPoint.angle = point.angle
        return NewPoint

    })
}

// key events
document.addEventListener("keydown", function (event) {
    DownKeys[event.key] = true;
});

document.addEventListener("keyup", function (event) {
    DownKeys[event.key] = false;
});


let RaceTrackOuterPoints = []
let RaceTrackInnerPoints = []

let RaceTrackOuterLines = [];
let RaceTrackInnerLines = [];

let CheckPointAmmount = 24;

let TrackOutObject = new BasicSprite(0, 0, 0, 0, "black");
let TrackInObject = new BasicSprite(0, 0, 0, 0, "black");

(async () => {

    let Map = await fetch("defaultMap.json")
    Map = (await Map.json()).Points

    let Offset = new Vector2D(2840+600, 810+400);

    StartingPosition = new Vector2D(Map[0].x + Offset.x, Map[0].y + Offset.y);

    for (let i = 0; i < 100; i++) {
        // 10 inputs for the 10 rays
        let ThisNN = new NeuralNetwork([10, 100, 100, 4], activationFunctions.sigmoid);
        let CNN = new CompeativeNeuralNetwork(ThisNN)
        CNN.car.x = StartingPosition.x;
        CNN.car.y = StartingPosition.y;
        CNN.car.angle = Map[0].angle + Math.PI / 2;
        NeuralNetworks.push(CNN);
    }
    


    Map.forEach(point => {

        RaceTrackOuterPoints.push(new Vector2D(point.outerPoint.x + Offset.x, point.outerPoint.y + Offset.y));
        RaceTrackInnerPoints.push(new Vector2D(point.innerPoint.x + Offset.x, point.innerPoint.y + Offset.y));

        CheckPoints.push(new Vector3D(point.x + Offset.x, point.y + Offset.y, point.angle));

    })


    for (let i = 0; i < RaceTrackOuterPoints.length; i++) {
        RaceTrackOuterLines.push(new Line(RaceTrackOuterPoints[i], RaceTrackOuterPoints[(i + 1) % RaceTrackOuterPoints.length]));
        RaceTrackInnerLines.push(new Line(RaceTrackInnerPoints[i], RaceTrackInnerPoints[(i + 1) % RaceTrackInnerPoints.length]));
    }

    TrackOutObject.lines = RaceTrackOuterLines;
    TrackInObject.lines = RaceTrackInnerLines;

    TrackInObject.update = function (world) {

    }
    TrackOutObject.update = function (world) { }

    RaceTrackInnerLines.forEach(line => {
        line.color = "white";
    });
    RaceTrackOuterLines.forEach(line => {
        line.color = "white";
    });

    TrackInObject.draw = function (ctx) {
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].draw(ctx);
        }
    }

    TrackOutObject.draw = function (ctx) {
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].draw(ctx);
        }
    }

    GameWorld.add(TrackOutObject);
    GameWorld.add(TrackInObject);

})()

function radToDeg(rad) {
    return rad * (180 / Math.PI);
}

function degToRad(deg) {
    return deg * (Math.PI / 180);
}