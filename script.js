const GameWorld = new World();
const CollisionUtils = new CollisionDetection()

let CarStartingX = 500 + Math.cos(0) * 350;
let CarStartingY = 500 + Math.sin(0) * 350;

const DownKeys = [];
var CheckPoints = [];

const MousePos = new Vector2D(0, 0);
const MouseButtons = new Vector3D(0, 0, 0);

let NeuralNetworkGeneration = 1;
let NeuralNetworks = [];
let IsRunning = true;
var IsTraining = false;
let SceneType = "Drive"; // LevelEditor, Train, Drive

var DebugVision = false;

const GameEvents = new EventTarget();

var SceneRenderInterval;
var SeconderyRenderInterval;

var DocumentEventListeners = [];

class DocumentEventListerner {
    constructor(event, callback) {
        this.event = event;
        this.callback = callback;

        this.tmpFunction = (e) => {
            this.callback(e);
        }

        document.addEventListener(this.event, this.tmpFunction);
    }
    remove() {
        document.removeEventListener(this.event, this.tmpFunction);
    }
}

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

GameEvents.addEventListener("sceneChanged", (e) => {

    if (e.detail.scene != "Menu") return

    if (SceneRenderInterval) clearInterval(SceneRenderInterval);
    if (SeconderyRenderInterval) clearInterval(SeconderyRenderInterval);

    // 0 main menu, 1 level select, 2 settings
    var SettingsSubmenu = 0

    let Buttons = [];

    let PlayButton = new Button(100, 100, 150, 50, "gray", "Play!", () => {
        SettingsSubmenu = 1;
    }, "lightgray", "black")
    Buttons.push(PlayButton);

    let Editor = new Button(100, 160, 150, 50, "gray", "Level Editor", () => {

        let GameLoadedEvent = new CustomEvent("preSceneChange", {
            detail: {
                scene: "LevelEditor",
            },
            bubbles: true,
            cancelable: true
        });
        GameEvents.dispatchEvent(GameLoadedEvent);

    }, "lightgray", "black")
    Buttons.push(Editor);

    // --------------------------------------------

    let Back = new Button(100, 100, 150, 50, "gray", "Back", () => {
        SettingsSubmenu = 0;
    }, "lightgray", "black")
    Buttons.push(Back);

    let Level1 = new Button(100, 160, 150, 50, "gray", "Level 1", async () => {

        SettingsSubmenu = -1;

        let Map = await fetch("defaultMap2.json")
        Map = (await Map.json()).Points;
        LoadMapFromPoints(Map);
        SetDrive()

    }, "lightgray", "black")
    Buttons.push(Level1);

    let Level2 = new Button(100, 220, 150, 50, "gray", "Level 2", async () => {

        SettingsSubmenu = -1;

        let Map = await fetch("defaultMap.json")
        Map = (await Map.json()).Points;
        LoadMapFromPoints(Map);
        SetDrive()

    }, "lightgray", "black")
    Buttons.push(Level2);

    let customMap = new Button(260, 160, 150, 50, "gray", "Custom Map", async () => {

        // file input
        let input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.click();
        input.remove();

        input.addEventListener("change", async (e) => {

            let file = e.target.files[0];
            let reader = new FileReader();

            reader.addEventListener("load", async (e) => {

                SettingsSubmenu = -1;

                let Map = JSON.parse(e.target.result).Points;
                LoadMapFromPoints(Map);
                SetDrive()

            })

            reader.readAsText(file);

        })

    }, "lightgray", "black")
    Buttons.push(customMap);

    // --------------------------------------------

    let Loading = new Button(100, 100, 150, 50, "gray", "Loading...", () => { }, "gray", "black")
    Buttons.push(Loading);

    SceneRenderInterval = setInterval(() => {

        ctx.clearRect(0, 0, Canvas.width, Canvas.height);

        Buttons.forEach((button) => {
            button.enabled = false;
        })

        switch (SettingsSubmenu) {

            case 0:

                PlayButton.enabled = true;
                Editor.enabled = true;

                break;

            case 1:

                Back.enabled = true;
                Level1.enabled = true;
                Level2.enabled = true;
                customMap.enabled = true;
                break;

            case -1:
                Loading.enabled = true;
                break;
        }

        Buttons.forEach((button) => {
            button.update()
            button.draw(ctx);
        })


    }, 1000 / 60);

})

GameEvents.addEventListener("sceneChanged", (e) => {

    if (e.detail.scene != "Drive") return

    if (SceneRenderInterval) clearInterval(SceneRenderInterval);
    if (SeconderyRenderInterval) clearInterval(SeconderyRenderInterval);

    GameEvents.addEventListener("modelLoaded", (e) => {

        var PlayerCheckpoint = 0;
        var PlayerCar = new Car(StartingPosition.x, StartingPosition.y, 100, 50, "green", 0.1);
        var CarObject = new Car(StartingPosition.x, StartingPosition.y, 100, 50, "blue", 0.1);

        PlayerCar.angle = StartingAngle
        CarObject.angle = StartingAngle

        var MenuButton = new Button(70 / 2, 40 / 2, 70, 40, "gray", "Menu", () => {
            let GameLoadedEvent = new CustomEvent("preSceneChange", {
                detail: {
                    scene: "Menu",
                },
                bubbles: true,
                cancelable: true
            });
            GameEvents.dispatchEvent(GameLoadedEvent);
        }, "lightgray", "black")

        PlayerCar.turnSpeed = 0.06

        // create a nn to race against
        let DrivingNN = new CompeativeNeuralNetwork(e.detail.loadedAI);
        DrivingNN.car = CarObject;

        let RaceStarted = false

        let Lap = 1
        let PlayerFinished = false

        let LapCounter = new Button(100, 100, 150, 50, "lightgray", "Lap 1/3", () => { }, "lightgray", "black")

        let AILap = 1
        let AIFinished = false

        let CountDownButton = new Button(100, 100, 150, 50, "lightgray", "3", () => { }, "lightgray", "black")

        let AIFinishTime = 0
        let PlayerFinishTime = 0

        let AITakeoverDrive = new CompeativeNeuralNetwork(e.detail.loadedAI);
        AITakeoverDrive.car = PlayerCar;

        let CountDown = 3;
        setInterval(() => {
            CountDown--;
            CountDownButton.text = CountDown;
            if (CountDown == 0) {
                RaceStarted = true;
                CountDownButton.text = "Go!";
            }
        }, 1000)

        let FinishedBackground = new Button(0, 0, 500, 250, "gray", "", () => { }, "gray", "gray")
        let FinishedTime = new Button(0, 0, 500, 20, "gray", "", () => { }, "gray", "black")

        let BackToMenu = new Button(0, 0, 500, 30, "gray", "Back to menu", () => {
            let GameLoadedEvent = new CustomEvent("preSceneChange", {
                detail: {
                    scene: "Menu",
                },
                bubbles: true,
                cancelable: true
            });
            GameEvents.dispatchEvent(GameLoadedEvent);
        }, "lightgray", "black")

        SceneRenderInterval = setInterval(() => {

            ctx.clearRect(0, 0, Canvas.width, Canvas.height);

            GameWorld.draw(ctx);

            MenuButton.update();
            MenuButton.draw(ctx);

            WorldCamera.x = -PlayerCar.x + Canvas.width / 2;
            WorldCamera.y = -PlayerCar.y + Canvas.height / 2;

            if (AILap > 3 && !AIFinished) {
                AIFinished = true;
                AIFinishTime = Date.now();
            }

            if (Lap > 3 && !PlayerFinished) {
                PlayerFinished = true;
                PlayerFinishTime = Date.now();
            }

            // center countdown button
            CountDownButton.x = Canvas.width / 2
            CountDownButton.y = 150

            // set Lap counter to the correct lap
            if (!PlayerFinished) {
                LapCounter.text = "Lap " + Lap + "/3";
            } else {
                LapCounter.text = "Lap 3/3";
            }
            // and make it in the bottom right corner
            LapCounter.x = Canvas.width - LapCounter.width - 10;
            LapCounter.y = Canvas.height - LapCounter.height - 10;

            if (RaceStarted) {

                if (!PlayerFinished) {
                    if (DownKeys["w"]) {
                        PlayerCar.accelerate();
                    }
                    if (DownKeys["s"]) {
                        PlayerCar.decelerate();
                    }
                    if (DownKeys["a"]) {
                        PlayerCar.turnLeft();
                    }
                    if (DownKeys["d"]) {
                        PlayerCar.turnRight();
                    }
                } else {
                    AITakeoverDrive.act(ctx);
                }

                PlayerCar.carUpdate(GameWorld);

                DrivingNN.act(ctx);
                CarObject.carUpdate(GameWorld);
                RenderNN(DrivingNN);

            }

            PlayerCar.update();
            PlayerCar.draw(ctx);

            CarObject.update();
            CarObject.draw(ctx);

            LapCounter.update();
            LapCounter.draw(ctx);

            if (CountDown > -1) {
                CountDownButton.update();
                CountDownButton.draw(ctx);
            }

            CheckPoints.forEach((point, i) => {

                let TempWorld = new World();
                TempWorld.add(PlayerCar);

                let Angle = point.z

                // make a raycast from each checkpoint
                let RayStart = new Vector2D(point.x - Math.cos(Angle) * 150, point.y - Math.sin(Angle) * 150);
                let RayEnd = new Vector2D(point.x + Math.cos(Angle) * 150, point.y + Math.sin(Angle) * 150);
                let Ray = CollisionUtils.rayCast(TempWorld, RayStart, RayEnd);

                // draw checkpoints
                if (i == PlayerCheckpoint) {
                    ctx.beginPath();
                    ctx.strokeStyle = "green";
                    ctx.moveTo(RayStart.x + WorldCamera.x, RayStart.y + WorldCamera.y);
                    ctx.lineTo(RayEnd.x + WorldCamera.x, RayEnd.y + WorldCamera.y);
                    ctx.stroke();
                }

                if (i == PlayerCheckpoint || i == DrivingNN.score) {

                    if (Ray.hit && Ray.hitSprite == PlayerCar && i == PlayerCheckpoint) {
                        PlayerCheckpoint = i + 1;
                        if (PlayerCheckpoint == CheckPoints.length) {
                            PlayerCheckpoint = 0;
                            Lap++;
                        }
                    }

                }

                TempWorld = new World();
                TempWorld.add(CarObject);

                Ray = CollisionUtils.rayCast(TempWorld, RayStart, RayEnd);

                if (i == DrivingNN.score) {

                    ctx.beginPath();
                    ctx.strokeStyle = "blue";
                    ctx.moveTo(RayStart.x + WorldCamera.x, RayStart.y + WorldCamera.y);
                    ctx.lineTo(RayEnd.x + WorldCamera.x, RayEnd.y + WorldCamera.y);
                    ctx.stroke();

                    if (Ray.hit && Ray.hitSprite == CarObject) {
                        DrivingNN.score = i + 1;
                        if (DrivingNN.score == CheckPoints.length) {
                            DrivingNN.score = 0;
                            AILap++;
                        }
                    }

                }


            });

            let TempWorld = new World();
            TempWorld.add(PlayerCar);

            if (PlayerFinished) {

                FinishedBackground.x = Canvas.width / 2
                FinishedBackground.y = Canvas.height / 2

                FinishedBackground.update();
                FinishedBackground.draw(ctx);

                FinishedTime.text = "You finished " + -((AIFinishTime - PlayerFinishTime) / 1000) + " seconds after the AI"
                FinishedTime.x = Canvas.width / 2
                FinishedTime.y = (Canvas.height / 2)

                FinishedTime.update();
                FinishedTime.draw(ctx);

                BackToMenu.x = Canvas.width / 2
                BackToMenu.y = (Canvas.height / 2) + ((250 / 2) + 14)

                BackToMenu.update();
                BackToMenu.draw(ctx);

            }

            PlayerCar.lines.forEach(plrLine => {

                function OnHitWall(trackLine) {
                    let Intersection = TempWorld.lineintersect(plrLine, trackLine).hitPoint;

                    let CarAngle = Math.atan2(PlayerCar.y - Intersection.y, PlayerCar.x - Intersection.x);
                    let Distance = Math.sqrt(Math.pow(PlayerCar.x - Intersection.x, 2) + Math.pow(PlayerCar.y - Intersection.y, 2));

                    PlayerCar.x = Intersection.x + Math.cos(CarAngle) * 85;
                    PlayerCar.y = Intersection.y + Math.sin(CarAngle) * 85;

                }

                TrackInObject.lines.forEach(trackLine => {

                    if (TempWorld.lineintersect(plrLine, trackLine).hit) {

                        OnHitWall(trackLine);

                    }

                })

                TrackOutObject.lines.forEach(trackLine => {

                    if (TempWorld.lineintersect(plrLine, trackLine).hit) {

                        OnHitWall(trackLine);

                    }

                })

            })


        }, 1000 / 60);

    }, { once: true })
})

GameEvents.addEventListener("sceneChanged", (e) => {

    if (e.detail.scene != "Train") return

    if (SceneRenderInterval) {
        clearInterval(SceneRenderInterval);
    }
    if (SeconderyRenderInterval) {
        clearInterval(SeconderyRenderInterval);
    }

    var Counter = 0;

    // Traning Loop
    SceneRenderInterval = setInterval(function () {

        ctx.clearRect(0, 0, Canvas.width, Canvas.height);

        GameWorld.draw(ctx);

        Counter++;

        if (NeuralNetworks.filter(nn => nn.disqualifyed == false).length == 0 && IsTraining) {
            Counter = 9999999999999999
        }

        NeuralNetworks.forEach(nn => {

            let CarObject = nn.car;

            if (nn.disqualifyed) return
            nn.act(ctx)
            CarObject.update();
            CarObject.draw(ctx);
            CarObject.carUpdate(GameWorld);

            // sort the cars by score
            let Sorted = NeuralNetworks.sort((a, b) => {
                return b.score - a.score;
            })

            let MainCar = Sorted[0]
            WorldCamera.x = -MainCar.car.x + Canvas.width / 2;
            WorldCamera.y = -MainCar.car.y + Canvas.height / 2;

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
                    ctx.moveTo(RayStart.x + WorldCamera.x, RayStart.y + WorldCamera.y);
                    ctx.lineTo(RayEnd.x + WorldCamera.x, RayEnd.y + WorldCamera.y);
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
                    if (LineCheck.hit && !nn.disqualifyed) {
                        nn.disqualifyed = true;
                    }
                });

            });


        });

    }, 1);

    SeconderyRenderInterval = setInterval(function () {

        // wait 15 seconds before triggering the next generation
        // create 100 copies of the best neural network
        // then mutate them

        if (Counter < 120 * 30) return
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

});

GameEvents.addEventListener("sceneChanged", (e) => {

    if (e.detail.scene != "LevelEditor") return

    if (SceneRenderInterval) clearInterval(SceneRenderInterval);
    if (SeconderyRenderInterval) clearInterval(SeconderyRenderInterval);

    var Points = [
        new LevelEditorPoint(500, 500, 0),
    ];

    let SelectedPoint = null;
    let LastSelectedPoint = Points[0];
    let SelectedPointType = false;
    let SelectedPointSide = false;

    let PointVisualiser = new BasicSprite(0, 0, 10, 10, "green")

    var MenuButton = new Button(70 / 2, 40 / 2, 70, 40, "gray", "Menu", () => {

        var Thisprompt = prompt(`Are you sure you want to leave?\nAll unsaved progress will be lost.\nType "Yes" to exit`)

        if (Thisprompt.toLocaleLowerCase() == "yes") {
            let GameLoadedEvent = new CustomEvent("preSceneChange", {
                detail: {
                    scene: "Menu",
                },
                bubbles: true,
                cancelable: true
            });
            GameEvents.dispatchEvent(GameLoadedEvent);
        }

    }, "lightgray", "black")

    var SaveButton = new Button(70 / 2, 40 / 2 + 50, 70, 40, "gray", "Save", () => {

        // use the MapToJSON function to convert the map to a JSON string
        var MapJSON = MapToJSON(Points);

        // download the JSON string as a file
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(MapJSON));
        element.setAttribute('download', "Map.json");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);

    }, "lightgray", "black")

    var LoadButton = new Button(70 / 2, 40 / 2 + 100, 70, 40, "gray", "Load", () => {

        var Thisprompt = prompt(`Are you sure you want to load a map?\nAll unsaved progress will be lost.\nType "Yes" to load`)

        if (Thisprompt.toLocaleLowerCase() == "yes") {
            var element = document.createElement('input');
            element.setAttribute('type', 'file');
            element.setAttribute('accept', '.json');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);

            element.addEventListener("change", (e) => {
                var file = e.target.files[0];
                var reader = new FileReader();
                reader.onload = function (e) {
                    var text = e.target.result;
                    Points = JSONToMap(JSON.parse(text));
                };
                reader.readAsText(file);
            });

        }

    }, "lightgray", "black")


    let Outline = new BasicSprite(0, 0, 15, 15, "white")
    SceneRenderInterval = setInterval(function () {

        ctx.clearRect(0, 0, Canvas.width, Canvas.height);

        Points.forEach((point, i) => {

            if (i == 0) {
                PointVisualiser.color = "blue"
            } else {
                PointVisualiser.color = "green"
            }

            if (point == LastSelectedPoint) {
                Outline.x = point.x
                Outline.y = point.y

                Outline.update()
                Outline.draw(ctx)
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

        MenuButton.update();
        MenuButton.draw(ctx);

        SaveButton.update();
        SaveButton.draw(ctx);

        LoadButton.update();
        LoadButton.draw(ctx);

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

    let temp, temp1, temp2;
    temp = new DocumentEventListerner("mousedown", function (event) {

        let MouseHoverPoints = Points.filter(point => {
            return (MousePos.x > (point.x + WorldCamera.x) - 5 && MousePos.x < (point.x + WorldCamera.x) + 5 && MousePos.y > (point.y + WorldCamera.y) - 5 && MousePos.y < (point.y + WorldCamera.y) + 5)
        })

        if (MouseHoverPoints.length > 0) {
            SelectedPoint = MouseHoverPoints[0];
            LastSelectedPoint = SelectedPoint
            SelectedPointType = false;
            SelectedPointSide = false;
        }

        let MouseHoverInnerPoints = Points.filter(point => {
            return (MousePos.x > (point.innerPoint.x + WorldCamera.x) - 5 && MousePos.x < (point.innerPoint.x + WorldCamera.x) + 5 && MousePos.y > (point.innerPoint.y + WorldCamera.y) - 5 && MousePos.y < (point.innerPoint.y + WorldCamera.y) + 5)
        })

        if (MouseHoverInnerPoints.length > 0) {
            SelectedPoint = MouseHoverInnerPoints[0];
            LastSelectedPoint = SelectedPoint
            SelectedPointType = true;
            SelectedPointSide = false;
        }

        let MouseHoverOuterPoints = Points.filter(point => {
            return (MousePos.x > (point.outerPoint.x + WorldCamera.x) - 5 && MousePos.x < (point.outerPoint.x + WorldCamera.x) + 5 && MousePos.y > (point.outerPoint.y + WorldCamera.y) - 5 && MousePos.y < (point.outerPoint.y + WorldCamera.y) + 5)
        })

        if (MouseHoverOuterPoints.length > 0) {
            SelectedPoint = MouseHoverOuterPoints[0];
            LastSelectedPoint = SelectedPoint
            SelectedPointType = true;
            SelectedPointSide = true;
        }

    })
    DocumentEventListeners.push(temp);

    temp1 = new DocumentEventListerner("mouseup", function (event) {
        if (SelectedPoint != null) {
            LastSelectedPoint = SelectedPoint;
        }
        SelectedPoint = null;
    })
    DocumentEventListeners.push(temp1);

    temp2 = new DocumentEventListerner("keydown", function (event) {
        if (event.key == "+" || event.key == "=") {
            let NewPoint = new LevelEditorPoint(MousePos.x - WorldCamera.x, MousePos.y - WorldCamera.y, 0);
            // set point to be infront of the last selected point in the array
            Points.splice(Points.indexOf(LastSelectedPoint) + 1, 0, NewPoint);
            LastSelectedPoint = NewPoint

        }

        if (event.key == "Backspace") {
            if (LastSelectedPoint == null) return
            Points.splice(Points.indexOf(LastSelectedPoint), 1);
        }

        // arrow keys move the camera
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

    });
    DocumentEventListeners.push(temp2);

})

GameEvents.addEventListener("preSceneChange", function (event) {

    WorldCamera.x = 0;
    WorldCamera.y = 0;

    // remove all document event listeners
    DocumentEventListeners.forEach(listener => {
        listener.remove();
        DocumentEventListeners.splice(DocumentEventListeners.indexOf(listener), 1);
    })

    clearInterval(SceneRenderInterval);
    clearInterval(SeconderyRenderInterval);

    console.log("Scene changed to " + event.detail.scene)

    let SceneChangeEvent = new CustomEvent("sceneChanged", {
        detail: {
            scene: event.detail.scene
        }
    })

    GameWorld.sprites = [];
    let TrackOutCopy = Object.assign({}, TrackOutObject);
    let TrackInCopy = Object.assign({}, TrackInObject);
    GameWorld.add(TrackOutCopy);
    GameWorld.add(TrackInCopy);

    GameEvents.dispatchEvent(SceneChangeEvent);

})

function MapToJSON(Points) {
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

    return JSON.stringify(JSONMap)
}

function JSONToMap(JSONMap) {
    return JSONMap.Points.map(point => {
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

let Offset = new Vector2D(2840 + 600, 810 + 400);

(async () => {

    console.log("Zach's CUM Engine v0.0.1")

    let Map = await fetch("defaultMap.json")
    Map = (await Map.json()).Points

    let StartingNetwork = await fetch("Small.network")
    StartingNetwork = await StartingNetwork.json()

    StartingPosition = new Vector2D(Map[0].x + Offset.x, Map[0].y + Offset.y);

    console.log("Loading pre-trained network...")

    //let DefaultNetwork = NeuralNetwork.fromJSON(StartingNetwork)
    let DefaultNetwork = new NeuralNetwork([10, 12, 8, 4], activationFunctions.sigmoid);
    DefaultNetwork.activationFunction = activationFunctions.sigmoid

    for (let i = 0; i < 100; i++) {
        let ThisNN = DefaultNetwork.copy()
        let CNN = new CompeativeNeuralNetwork(ThisNN)
        CNN.car.x = StartingPosition.x;
        CNN.car.y = StartingPosition.y;
        CNN.car.angle = Map[0].angle + Math.PI / 2;
        NeuralNetworks.push(CNN);
    }

    let GameLoadedEvent = new CustomEvent("preSceneChange", {
        detail: {
            scene: "Menu",
        },
        bubbles: true,
        cancelable: true
    });
    GameEvents.dispatchEvent(GameLoadedEvent);

    IsTraining = true;
    Counter = 9999999999999999

    LoadMapFromPoints(Map)

})()

function LoadMapFromPoints(Map) {

    StartingPosition = new Vector2D(Map[0].x + Offset.x, Map[0].y + Offset.y);
    StartingAngle = Map[0].angle - Math.PI / 2;

    RaceTrackOuterPoints = []
    RaceTrackInnerPoints = []

    RaceTrackOuterLines = [];
    RaceTrackInnerLines = [];

    CheckPoints = [];

    StartingPosition = new Vector2D(Map[0].x + Offset.x, Map[0].y + Offset.y);

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

    TrackInObject.update = function (world) { }
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
}

async function SetDrive() {

    let GameSceneEvent = new CustomEvent("preSceneChange", {
        detail: {
            scene: "Drive",
        },
        bubbles: true,
        cancelable: true
    });
    GameEvents.dispatchEvent(GameSceneEvent);

    let StartingNetwork = await fetch("Smaller.network")
    StartingNetwork = await StartingNetwork.json()

    let DefaultNetwork = NeuralNetwork.fromJSON(StartingNetwork)
    DefaultNetwork.activationFunction = activationFunctions.sigmoid;

    let GameModelEvent = new CustomEvent("modelLoaded", {
        detail: {
            loadedAI: DefaultNetwork
        },
        bubbles: true,
        cancelable: true
    });
    GameEvents.dispatchEvent(GameModelEvent);

}

function radToDeg(rad) {
    return rad * (180 / Math.PI);
}

function degToRad(deg) {
    return deg * (Math.PI / 180);
}

function StartTraining() {
    let GameSceneEvent = new CustomEvent("preSceneChange", {
        detail: {
            scene: "Train",
        },
        bubbles: true,
        cancelable: true
    });

    GameEvents.dispatchEvent(GameSceneEvent);
}

const win = {}

function RenderNN(nn) {

    // take a nn as input and render a visual representation of it on the screen

    if (win.window == undefined) {
        PopoutNN()
    }

    let canvas = win.window.document.getElementById("nnCanvas");
    let ctx = canvas.getContext("2d");

    // set canvas size to the size of the window
    canvas.width = win.window.innerWidth;
    canvas.height = win.window.innerHeight;

    let layers = nn.nn.Layers;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // add a cream background
    ctx.fillStyle = "#FFFDD0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const NeronSize = 5*5;
    const NeronSpacingX = 50*5;
    const NeronSpacingY = 15*5;

    function DrawNeron(X, Y, T) {

        // white circle with a black border
        ctx.beginPath();
        ctx.arc(X, Y, NeronSize, 0, 2 * Math.PI);
        // lerp between white and red
        let color = `rgb(${T * 255}, ${T * 255}, ${T * 255})`
        ctx.fillStyle = color
        ctx.fill();

        ctx.beginPath();
        ctx.arc(X, Y, NeronSize, 0, 2 * Math.PI);
        ctx.strokeStyle = "black";
        ctx.stroke();

    }

    function DrawConnection(X1, Y1, X2, Y2, T) {

        // lerp between white and red
        let color = `rgb(${T * 255}, ${T * 255}, ${T * 255})`
        ctx.strokeStyle = color;
        // stroke thickness
        ctx.lineWidth = NeronSize/5;
        ctx.beginPath();
        ctx.moveTo(X1, Y1);
        ctx.lineTo(X2, Y2);
        ctx.stroke();

    }

    for (let i = 0; i < layers.length; i++) {

        let Thislayer = layers[i];
        for (let j = 0; j < Thislayer.Neurons.length; j++) {

            if (i == layers.length - 1) break;
            let nextLayer = layers[i + 1]

            // sort next layer by weight, but dont change the actual layer
            nextLayer.Neurons.sort((a, b) => {
                //return b.Connections[j].Weight - a.Connections[j].Weight
            })

            for (let k = 0; k < nextLayer.Neurons.length; k++) {

                let nextNeuron = nextLayer.Neurons[k];

                //console.log(nextNeuron)

                let X1 = (i + 1) * NeronSpacingX
                let Y1 = (j + 1) * NeronSpacingY + (canvas.height - (Thislayer.Neurons.length + 1) * NeronSpacingY) / 2

                let X2 = (i + 2) * NeronSpacingX
                let Y2 = (k + 1) * NeronSpacingY + (canvas.height - (nextLayer.Neurons.length + 1) * NeronSpacingY) / 2

                // t should be the weight * the output of the previous neuron
                let T = (nextNeuron.Connections[j].Weight * Thislayer.Neurons[j].Output) * 3

                DrawConnection(X1, Y1, X2, Y2, T)

            }


        }

        for (let j = 0; j < Thislayer.Neurons.length; j++) {

            let neuron = Thislayer.Neurons[j];

            // draw a small circle for each neuron
            let X = (i + 1) * NeronSpacingX
            // the nurons should be 1 pixel apart from each other, and the entire layer should be centered
            let Y = (j + 1) * NeronSpacingY + (canvas.height - (Thislayer.Neurons.length + 1) * NeronSpacingY) / 2

            DrawNeron(X, Y, neuron.Output)

        }

    }

}

// make popout window to show the neural network
function PopoutNN() {
    win.window = window.open("", "Neural Network", "width=600,height=600");
    win.window.document.body.innerHTML = `<canvas id="nnCanvas" width="300" height="300"></canvas>`

    // add css to the window
    let style = win.window.document.createElement("style");
    style.innerHTML = `
    body {
        margin: 0;
        padding: 0;
        background-color: #FFFDD0;
    }

    canvas {
        width: 100%;
        height: 100%;
    }
    `
    win.window.document.head.appendChild(style)

    RenderNN(loadedAI)
}