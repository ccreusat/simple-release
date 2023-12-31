import axios from "axios";

export async function generateReleaseNote(
  owner: string,
  repo: string,
  token: string
) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

  try {
    // Récupérer les releases depuis l'API GitHub
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log({ response });

    // Afficher les informations des releases
    response.data.forEach((release) => {
      console.log({ release });
      console.log(`Version: ${release.tag_name}`);
      console.log(`Nom: ${release.name}`);
      console.log(`Date de publication: ${release.published_at}`);
      console.log(`Corps:\n${release.body}`);
      console.log("---");
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des releases :",
      error.message
    );
  }
}
