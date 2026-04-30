const viewer = document.getElementById("hero-computer-model");
const hint = document.querySelector(".pixel-hero__screen-hint");

function setHint(text) {
  if (hint) {
    hint.textContent = text;
  }
}

if (viewer) {
  viewer.addEventListener("load", async () => {
    setHint("Model loaded");

    const screenMaterial = viewer.model?.materials?.find(
      (material) => material.name === "Screen"
    );

    if (!screenMaterial) {
      setHint("Screen material not found");
      return;
    }

    setHint("Screen material found");

    const texture = await viewer.createTexture("assets/art-project-cat.png");
    const baseColorTexture = screenMaterial.pbrMetallicRoughness.baseColorTexture;

    if (!baseColorTexture) {
      setHint("Screen texture slot missing");
      return;
    }

    screenMaterial.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
    setHint("Applying cat texture");
    baseColorTexture.setTexture(texture);

    if (baseColorTexture.texture?.sampler) {
      baseColorTexture.texture.sampler.setScale({ u: 1, v: 1 });
      baseColorTexture.texture.sampler.setOffset({ u: 0, v: 0 });
      baseColorTexture.texture.sampler.setRotation(0);
    }

    setHint("Cat texture applied");
  });
}
