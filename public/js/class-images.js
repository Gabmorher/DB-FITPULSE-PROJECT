const defaultImage = "/assets/gym.jpg";

const categoryImages = {
  yoga: "/assets/classes/yoga.jpg",
  spinning: "/assets/classes/spinning.jpg",
  crossfit: "/assets/classes/crossfit.jpg",
};

export function imageFor(category) {
  return categoryImages[category.toLowerCase()] || defaultImage;
}
