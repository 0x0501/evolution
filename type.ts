class Animal {}

class Dog extends Animal {
	bark() {
		console.log("Woof");
	}
}

class Cat extends Animal {
	meow() {
		console.log("Meow");
	}
}

const isDog = (animal: Animal): animal is Dog => animal instanceof Dog;
const isCat = (animal: Animal): animal is Cat => animal instanceof Cat;

function getAnimal<T extends Animal>(animal: T) {
	if (isDog(animal)) {
		animal.bark();
	} else if (isCat(animal)) {
		animal.meow();
	}
}
