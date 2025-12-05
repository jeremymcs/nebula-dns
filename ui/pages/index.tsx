import { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>SafeDNS - DNS Security & Content Filtering</title>
        <meta name="description" content="SafeDNS Control Plane" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SafeDNS Control Plane
          </h1>
          <p className="text-lg text-gray-600">
            Multi-tenant DNS security and content filtering SaaS
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
