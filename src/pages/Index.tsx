// pages/Index.tsx
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
// Remove this line: import FirestoreDebug from "@/components/FirestoreDebug";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      {/* Remove this line: <FirestoreDebug /> */}
      <Footer />
    </div>
  );
};

export default Index;