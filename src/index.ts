/* CSCI 5619 Lecture 20, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Logger } from "@babylonjs/core/Misc/logger";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder, TransformNode } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture"
import { VirtualKeyboard } from "@babylonjs/gui/2D/controls/virtualKeyboard" 
import { InputText } from "@babylonjs/gui/2D/controls/inputText" 
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"
import { RadioButton } from "@babylonjs/gui/2D/controls/radioButton"
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel"
import { Control } from "@babylonjs/gui/2D/controls/control"
import { Mesh } from "@babylonjs/core/Meshes/mesh"

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import { ControlPropertyGridComponent } from "@babylonjs/inspector/components/actionTabs/tabs/propertyGrids/gui/controlPropertyGridComponent";

class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private configurableMesh: Mesh | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        this.configurableMesh = null;
    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       var pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            skyboxSize: 50,
            skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the ground and skybox are not pickable!
        environment!.ground!.isPickable = false;
        environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation
        xrHelper.teleportation.dispose();

        // Assign the left and right controllers to member variables
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            if(inputSource.uniqueId.endsWith("right"))
            {
                this.rightController = inputSource;
            }
            else 
            {
                this.leftController = inputSource;
            }  
        });

        // Don't forget to deparent objects from the controllers or they will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right")) 
            {

            }
        });

        // Create a parent transform
        var textTransform = new TransformNode("textTransform");
        textTransform.rotation.y = 270 * Math.PI / 180;

        // Create a plane for a text block
        var staticTextPlane = MeshBuilder.CreatePlane("textPlane", {width: 10, height: 5}, this.scene);
        staticTextPlane.position = new Vector3(0, 7, 8);
        staticTextPlane.isPickable = false;
        staticTextPlane.parent = textTransform;

        // Create a dynamic texture for the text block
        var staticTextTexture = AdvancedDynamicTexture.CreateForMesh(staticTextPlane, 1000, 500);
        staticTextTexture.background = "#414163";

        // Create a static text block
        var staticText = new TextBlock();
        staticText.text = "";
        staticText.color = "white";
        staticText.fontSize = 32;
        staticText.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        staticText.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
        staticTextTexture.addControl(staticText);

        // Create a plane for a virtual keyboard
        var keyboardPlane = MeshBuilder.CreatePlane("keyboardPlane", {}, this.scene);
        keyboardPlane.position = new Vector3(0, 1.6, 1);
        keyboardPlane.parent = textTransform;

        // Create a dynamic texture for the virtual keyboard
        var keyboardTexture = AdvancedDynamicTexture.CreateForMesh(keyboardPlane, 1024, 1024);

        // Create a keyboard input text field
        var keyboardInput = new InputText(); 
        keyboardInput.top = -260;
        keyboardInput.width = 1;
        keyboardInput.height = "80px";
        keyboardInput.fontSize = 36;
        keyboardInput.color = "white";
        keyboardInput.background = "#070707";    
		keyboardTexture.addControl(keyboardInput);

        // Create a virtual keyboard
        var virtualKeyboard = VirtualKeyboard.CreateDefaultLayout("virtualKeyboard");
        virtualKeyboard.scaleX = 2.0;
        virtualKeyboard.scaleY = 2.0;
        keyboardTexture.addControl(virtualKeyboard);

        // This connects automatically hides the keyboard
        //virtualKeyboard.connect(keyboardInput);

        // This keeps the keyboard visible
        virtualKeyboard.onKeyPressObservable.add((key) => {
            switch(key)
            {
                // Backspace
                case '\u2190':
                    keyboardInput.processKey(8);
                    break;

                // Shift
                case '\u21E7':
                    virtualKeyboard.shiftState = virtualKeyboard.shiftState == 0 ? 1 : 0;
                    virtualKeyboard.applyShiftState(virtualKeyboard.shiftState);
                    break;

                // Enter
                case '\u21B5':
                    keyboardInput.processKey(13);
                    staticText.text += "\n> " + keyboardInput.text;
                    break;  
                
                default:
                    keyboardInput.processKey(-1, virtualKeyboard.shiftState == 0 ? key : key.toUpperCase());
            }
        });

        // Create a parent transform for the object configuration panel
        var configTransform = new TransformNode("textTransform");

        // Create a plane for the object configuration panel
        var configPlane = MeshBuilder.CreatePlane("configPlane", {width: 1.5, height: .5}, this.scene);
        configPlane.position = new Vector3(0, 2, 1);
        configPlane.parent = configTransform;

        // Create a dynamic texture the object configuration panel
        var configTexture = AdvancedDynamicTexture.CreateForMesh(configPlane, 1500, 500);
        configTexture.background = (new Color4(.5, .5, .5, .25)).toHexString();

        var radioButtonPanel = new StackPanel();
        radioButtonPanel.isVertical = true;
        radioButtonPanel.widthInPixels = 1400;
        radioButtonPanel.heightInPixels = 400;
        radioButtonPanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;
        configTexture.addControl(radioButtonPanel);

        var radioButton1 = new RadioButton("radioButton1");
        radioButton1.width = "50px";
        radioButton1.height = "50px";
        radioButton1.color = "lightblue";
        radioButton1.background = "black";

        var radioButton1Header = Control.AddHeader(radioButton1, "box", "1200px", {isHorizontal: true, controlFirst: true});
        radioButton1Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        radioButton1Header.height = "75px";
        radioButton1Header.fontSize = "48px";
        radioButton1Header.color = "white";
        radioButtonPanel.addControl(radioButton1Header);
        
        var radioButton2 = new RadioButton("radioButton1");
        radioButton2.width = "50px";
        radioButton2.height = "50px";
        radioButton2.color = "lightblue";
        radioButton2.background = "black";

        var radioButton2Header = Control.AddHeader(radioButton2, "sphere", "1200px", {isHorizontal: true, controlFirst: true});
        radioButton2Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        radioButton2Header.height = "75px";
        radioButton2Header.fontSize = "48px";
        radioButton2Header.color = "white";
        radioButtonPanel.addControl(radioButton2Header);

        var configurableMeshTransform = new TransformNode("configurableMeshTransform", this.scene);
        configurableMeshTransform.position = new Vector3(0, 1, 4);


        radioButton1.onIsCheckedChangedObservable.add( (state) => {
            if(state)
            {
                if(this.configurableMesh)
                {
                    this.configurableMesh.dispose();
                }
                this.configurableMesh = MeshBuilder.CreateBox("configurableMesh", {size: 1}, this.scene);
                this.configurableMesh.parent = configurableMeshTransform;
            
            }
        });   

        radioButton2.onIsCheckedChangedObservable.add( (state) => {
            if(state)
            {
                if(this.configurableMesh)
                {
                    this.configurableMesh.dispose();
                }
                this.configurableMesh = MeshBuilder.CreateSphere("configurableMesh", {diameter: 1}, this.scene);
                this.configurableMesh.parent = configurableMeshTransform;
            }
        }); 

        


        this.scene.debugLayer.show(); 
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
 
    }

}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();