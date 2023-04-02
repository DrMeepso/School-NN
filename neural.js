class NeuralNetwork {

    Layers = [];
    activationFunction = null;

    constructor(Layers, activationFunction) {

        this.activationFunction = activationFunction;

        Layers.forEach((NeuronCount, index) => {

            let PreviousLayer = null;
            if (index != 0) {
                PreviousLayer = this.Layers[index - 1];
            }

            this.Layers.push(new Layer(NeuronCount, PreviousLayer));

        });

    }

    predict(input) {


        let ThisLayer = this.Layers[0];

        for (let i = 0; i < ThisLayer.Neurons.length; i++) {
            ThisLayer.Neurons[i].Output = input[i];
        }

        for (let i = 1; i < this.Layers.length; i++) {

            ThisLayer = this.Layers[i];

            for (let j = 0; j < ThisLayer.Neurons.length; j++) {

                let ThisNeuron = ThisLayer.Neurons[j];
                let Sum = 0;

                for (let k = 0; k < ThisNeuron.Connections.length; k++) {
                    Sum += ThisNeuron.Connections[k].ImputNeuron.Output * ThisNeuron.Connections[k].Weight;
                }

                Sum += ThisNeuron.Bias;

                ThisNeuron.Output = this.activationFunction(Sum);

            }

        }

        return this.Layers[this.Layers.length - 1].Neurons.map(n => n.Output);

    }

    mutate(mutationRate) {

        let mutateAmmount = 0.1;

        for (let i = 0; i < this.Layers.length; i++) {

            let ThisLayer = this.Layers[i];

            for (let j = 0; j < ThisLayer.Neurons.length; j++) {

                let ThisNeuron = ThisLayer.Neurons[j];

                for (let k = 0; k < ThisNeuron.Connections.length; k++) {

                    if (Math.random() < mutationRate) {
                        ThisNeuron.Connections[k].Weight = Math.random() * mutateAmmount * 2 - mutateAmmount;
                    }

                }

                if (Math.random() < mutationRate) {
                    ThisNeuron.Bias = Math.random() * mutateAmmount * 2 - mutateAmmount;
                }

            }

        }

    }

    crossover(other) {

        let child = new NeuralNetwork(this.Layers.map(l => l.Neurons.length), this.activationFunction);

        for (let i = 0; i < this.Layers.length; i++) {

            let ThisLayer = this.Layers[i];
            let OtherLayer = other.Layers[i];
            let ChildLayer = child.Layers[i];

            for (let j = 0; j < ThisLayer.Neurons.length; j++) {

                let ThisNeuron = ThisLayer.Neurons[j];
                let OtherNeuron = OtherLayer.Neurons[j];
                let ChildNeuron = ChildLayer.Neurons[j];

                for (let k = 0; k < ThisNeuron.Connections.length; k++) {

                    if (Math.random() < 0.5) {
                        ChildNeuron.Connections[k].Weight = ThisNeuron.Connections[k].Weight;
                    } else {
                        ChildNeuron.Connections[k].Weight = OtherNeuron.Connections[k].Weight;
                    }

                }

                if (Math.random() < 0.5) {
                    ChildNeuron.Bias = ThisNeuron.Bias;
                } else {
                    ChildNeuron.Bias = OtherNeuron.Bias;
                }

            }

        }

        return child;

    }

    copy() {

        let copy = new NeuralNetwork(this.Layers.map(l => l.Neurons.length), this.activationFunction);

        for (let i = 0; i < this.Layers.length; i++) {

            let ThisLayer = this.Layers[i];
            let CopyLayer = copy.Layers[i];

            for (let j = 0; j < ThisLayer.Neurons.length; j++) {

                let ThisNeuron = ThisLayer.Neurons[j];
                let CopyNeuron = CopyLayer.Neurons[j];

                for (let k = 0; k < ThisNeuron.Connections.length; k++) {

                    CopyNeuron.Connections[k].Weight = ThisNeuron.Connections[k].Weight;

                }

                CopyNeuron.Bias = ThisNeuron.Bias;

            }

        }

        return copy;

    }

    toJSON() {

        let json = {
            Layers: this.Layers.map(l => l.Neurons.length),
            activationFunction: this.activationFunction.name,
            Weights: [],
            Biases: []
        };

        for (let i = 0; i < this.Layers.length; i++) {

            let ThisLayer = this.Layers[i];

            for (let j = 0; j < ThisLayer.Neurons.length; j++) {

                let ThisNeuron = ThisLayer.Neurons[j];

                for (let k = 0; k < ThisNeuron.Connections.length; k++) {

                    json.Weights.push(ThisNeuron.Connections[k].Weight);

                }

                json.Biases.push(ThisNeuron.Bias);

            }

        }

        return json;

    }

    static fromJSON(json) {

        let nn = new NeuralNetwork(json.Layers, json.activationFunction);

        let Weights = json.Weights;
        let Biases = json.Biases;

        for (let i = 0; i < nn.Layers.length; i++) {

            let ThisLayer = nn.Layers[i];

            for (let j = 0; j < ThisLayer.Neurons.length; j++) {

                let ThisNeuron = ThisLayer.Neurons[j];

                for (let k = 0; k < ThisNeuron.Connections.length; k++) {

                    ThisNeuron.Connections[k].Weight = Weights.shift();

                }

                ThisNeuron.Bias = Biases.shift();

            }

        }

        return nn;

    }
    
}

class Layer {

    Neurons = [];

    constructor(AmmountOfNeurons, PreviousLayer) {

        for (let i = 0; i < AmmountOfNeurons; i++) {

            let ThisNeuron = new Neuron();
            if (PreviousLayer != null) {
                for (let j = 0; j < PreviousLayer.Neurons.length; j++) {
                    ThisNeuron.Connections.push(new Connection(PreviousLayer.Neurons[j], ThisNeuron));
                }
            }
            this.Neurons.push(ThisNeuron);

        }

    }

}

class Neuron {

    Connections = [];
    Bias = 0;

    constructor() {
        this.Bias = Math.random() * 50 - 25;
    }

}

class Connection {

    Weight = 0;
    ImputNeuron = null;
    OutputNeuron = null;

    constructor(ImputNeuron, OutputNeuron) {

        this.ImputNeuron = ImputNeuron;
        this.OutputNeuron = OutputNeuron;

        this.Weight = Math.random() * 50 - 25;

    }

}


class activationFunctions {
    static sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    static dsigmoid(y) {
        return y * (1 - y);
    }
    static tanh(x) {
        return Math.tanh(x);
    }
    static dtanh(y) {
        return 1 - y * y;
    }
}