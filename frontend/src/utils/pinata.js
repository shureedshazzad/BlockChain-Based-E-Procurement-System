import axios from "axios";
import dotenv from "dotenv";


dotenv.config();


const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY

export const uploadToPinata = async(file) =>{
    try {
        const formData = new FormData();
        formData.append("file", file);

         // Metadata for the file
         const metaData = JSON.stringify({
            name: file.name,
         });
         formData.append("pinataMetadata", metaData);

         // Options for pinning the file
         const options = JSON.stringify({
            cidVersion: 1,
          });

          formData.append("pinataOptions", options);

          const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS",formData,{
              headers: {
                "Content-Type": "multipart/form-data",
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_API_KEY,
              },
          });

          return response.data.IpfsHash; // Return the IPFS hash

    } catch (error) {
        console.error("Error uploading to Pinata:", error);
        throw error;
    }
}