import Layout from "@/components/Layout";
import "@/styles/globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import Toastify CSS

function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <ToastContainer/>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
