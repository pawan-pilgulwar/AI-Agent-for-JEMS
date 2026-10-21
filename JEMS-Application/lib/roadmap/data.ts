/**
 * Static career roadmaps: each career path is a sequence of phases, each phase a
 * list of modules (topics, resources, skills). Ported from the SIH demo; pure
 * data with no runtime dependencies so it can be imported on the server (to
 * grade quizzes / compute progress) and on the client (to render).
 *
 * Module ids are unique *within* a roadmap and are what `roadmapProgress`
 * stores, so never renumber existing modules — append instead.
 */

export type ResourceType = 'video' | 'article' | 'project'

export interface Resource {
  type: ResourceType
  title: string
  duration?: string
}

export interface Module {
  id: number
  title: string
  duration: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  topics: string[]
  resources: Resource[]
  skills: string[]
}

export interface Phase {
  id: number
  title: string
  duration: string
  modules: Module[]
}

export interface CareerRoadmap {
  id: string
  title: string
  targetRole: string
  estimatedDuration: string
  phases: Phase[]
}

export const roadmaps: Record<string, CareerRoadmap> = {
  fullstack: {
    id: 'fullstack',
    title: 'Full Stack Developer Roadmap',
    targetRole: 'Full Stack Developer',
    estimatedDuration: '6-8 months',
    phases: [
      {
        id: 1,
        title: 'Web Foundations',
        duration: '4-6 weeks',
        modules: [
          {
            id: 1,
            title: 'HTML & CSS Fundamentals',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['HTML5 Semantics', 'CSS Flexbox & Grid', 'Responsive Design', 'CSS Variables'],
            resources: [
              { type: 'video', title: 'HTML & CSS Crash Course', duration: '4 hours' },
              { type: 'article', title: 'MDN Web Docs - HTML' },
              { type: 'project', title: 'Build a Portfolio Website' },
            ],
            skills: ['HTML5', 'CSS3', 'Responsive Design'],
          },
          {
            id: 2,
            title: 'JavaScript Essentials',
            duration: '3 weeks',
            difficulty: 'Beginner',
            topics: ['Variables & Data Types', 'Functions & Scope', 'DOM Manipulation', 'ES6+ Features', 'Async/Await'],
            resources: [
              { type: 'video', title: 'JavaScript Complete Course', duration: '12 hours' },
              { type: 'article', title: 'JavaScript.info Tutorial' },
              { type: 'project', title: 'Interactive Todo App' },
            ],
            skills: ['JavaScript', 'ES6+', 'DOM Manipulation'],
          },
        ],
      },
      {
        id: 2,
        title: 'Frontend Development',
        duration: '8-10 weeks',
        modules: [
          {
            id: 3,
            title: 'React Fundamentals',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['Components & Props', 'State & Lifecycle', 'Hooks', 'Context API', 'React Router'],
            resources: [
              { type: 'video', title: 'React - The Complete Guide', duration: '40 hours' },
              { type: 'article', title: 'React Official Documentation' },
              { type: 'project', title: 'E-commerce Product Catalog' },
            ],
            skills: ['React', 'JSX', 'Hooks', 'State Management'],
          },
          {
            id: 4,
            title: 'TypeScript & Modern Tooling',
            duration: '2 weeks',
            difficulty: 'Intermediate',
            topics: ['TypeScript Basics', 'Type Safety', 'Interfaces & Types', 'Vite & Build Tools'],
            resources: [
              { type: 'video', title: 'TypeScript for React Developers', duration: '6 hours' },
              { type: 'article', title: 'TypeScript Handbook' },
              { type: 'project', title: 'Type-safe React App' },
            ],
            skills: ['TypeScript', 'Type Safety', 'Build Tools'],
          },
        ],
      },
      {
        id: 3,
        title: 'Backend Development',
        duration: '8-10 weeks',
        modules: [
          {
            id: 5,
            title: 'Node.js & Express',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['Node.js Fundamentals', 'Express Framework', 'RESTful APIs', 'Middleware', 'Authentication'],
            resources: [
              { type: 'video', title: 'Node.js Complete Course', duration: '15 hours' },
              { type: 'article', title: 'Express.js Documentation' },
              { type: 'project', title: 'REST API for Blog Platform' },
            ],
            skills: ['Node.js', 'Express', 'REST APIs'],
          },
          {
            id: 6,
            title: 'Databases & Authentication',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['SQL Fundamentals', 'PostgreSQL', 'MongoDB', 'JWT Auth', 'Database Design'],
            resources: [
              { type: 'video', title: 'Database Design & SQL', duration: '10 hours' },
              { type: 'article', title: 'PostgreSQL Tutorial' },
              { type: 'project', title: 'Full-stack CRUD Application' },
            ],
            skills: ['SQL', 'MongoDB', 'JWT', 'PostgreSQL'],
          },
        ],
      },
      {
        id: 4,
        title: 'Deployment & Job Prep',
        duration: '4-6 weeks',
        modules: [
          {
            id: 7,
            title: 'Cloud Deployment & DevOps',
            duration: '2 weeks',
            difficulty: 'Advanced',
            topics: ['Docker Basics', 'CI/CD Pipelines', 'Vercel/Netlify', 'AWS Basics'],
            resources: [
              { type: 'video', title: 'DevOps for Developers', duration: '8 hours' },
              { type: 'article', title: 'Docker Documentation' },
              { type: 'project', title: 'Deploy Production App' },
            ],
            skills: ['Docker', 'CI/CD', 'AWS'],
          },
          {
            id: 8,
            title: 'DSA & Interview Prep',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Arrays & Strings', 'Trees & Graphs', 'Dynamic Programming', 'System Design'],
            resources: [
              { type: 'video', title: 'DSA Complete Course', duration: '30 hours' },
              { type: 'article', title: 'LeetCode Study Plan' },
              { type: 'project', title: 'Solve 100 LeetCode Problems' },
            ],
            skills: ['DSA', 'Problem Solving', 'System Design'],
          },
        ],
      },
    ],
  },

  'ai-ml': {
    id: 'ai-ml',
    title: 'AI/ML Engineer Roadmap',
    targetRole: 'AI/ML Engineer',
    estimatedDuration: '8-10 months',
    phases: [
      {
        id: 1,
        title: 'Mathematical Foundations',
        duration: '4-6 weeks',
        modules: [
          {
            id: 1,
            title: 'Python for Data Science',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['Python Basics', 'NumPy', 'Pandas', 'Matplotlib', 'Data Manipulation'],
            resources: [
              { type: 'video', title: 'Python for Data Science Bootcamp', duration: '25 hours' },
              { type: 'article', title: 'NumPy Documentation' },
              { type: 'project', title: 'Exploratory Data Analysis Project' },
            ],
            skills: ['Python', 'NumPy', 'Pandas', 'Data Analysis'],
          },
          {
            id: 2,
            title: 'Math & Statistics for ML',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['Linear Algebra', 'Probability', 'Statistics', 'Calculus Basics'],
            resources: [
              { type: 'video', title: 'Mathematics for Machine Learning', duration: '20 hours' },
              { type: 'article', title: 'Khan Academy Statistics' },
              { type: 'project', title: 'Statistical Analysis of Dataset' },
            ],
            skills: ['Statistics', 'Linear Algebra', 'Probability'],
          },
        ],
      },
      {
        id: 2,
        title: 'Machine Learning',
        duration: '8-10 weeks',
        modules: [
          {
            id: 3,
            title: 'Classical Machine Learning',
            duration: '4 weeks',
            difficulty: 'Intermediate',
            topics: ['Regression', 'Classification', 'Clustering', 'Scikit-learn', 'Model Evaluation'],
            resources: [
              { type: 'video', title: 'Machine Learning with Scikit-learn', duration: '18 hours' },
              { type: 'article', title: 'Scikit-learn Documentation' },
              { type: 'project', title: 'House Price Prediction Model' },
            ],
            skills: ['Scikit-learn', 'Machine Learning', 'Model Evaluation'],
          },
          {
            id: 4,
            title: 'Feature Engineering & Selection',
            duration: '2 weeks',
            difficulty: 'Intermediate',
            topics: ['Feature Scaling', 'Encoding', 'Dimensionality Reduction', 'PCA'],
            resources: [
              { type: 'video', title: 'Feature Engineering for ML', duration: '8 hours' },
              { type: 'article', title: 'Kaggle Feature Engineering Guide' },
              { type: 'project', title: 'Kaggle Competition Entry' },
            ],
            skills: ['Feature Engineering', 'PCA', 'Data Preprocessing'],
          },
        ],
      },
      {
        id: 3,
        title: 'Deep Learning',
        duration: '8-10 weeks',
        modules: [
          {
            id: 5,
            title: 'Neural Networks & TensorFlow',
            duration: '4 weeks',
            difficulty: 'Advanced',
            topics: ['Neural Networks', 'Backpropagation', 'TensorFlow', 'Keras', 'CNNs'],
            resources: [
              { type: 'video', title: 'Deep Learning Specialization', duration: '60 hours' },
              { type: 'article', title: 'TensorFlow Documentation' },
              { type: 'project', title: 'Image Classification CNN' },
            ],
            skills: ['TensorFlow', 'Keras', 'Deep Learning', 'CNN'],
          },
          {
            id: 6,
            title: 'NLP & Transformers',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['NLP Basics', 'Word Embeddings', 'Transformers', 'BERT', 'Hugging Face'],
            resources: [
              { type: 'video', title: 'NLP with Transformers', duration: '20 hours' },
              { type: 'article', title: 'Hugging Face Course' },
              { type: 'project', title: 'Sentiment Analysis App' },
            ],
            skills: ['NLP', 'Transformers', 'BERT', 'Hugging Face'],
          },
        ],
      },
      {
        id: 4,
        title: 'MLOps & Deployment',
        duration: '4-5 weeks',
        modules: [
          {
            id: 7,
            title: 'Model Deployment & MLOps',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['FastAPI', 'Model Serving', 'Docker', 'AWS SageMaker', 'Monitoring'],
            resources: [
              { type: 'video', title: 'MLOps Fundamentals', duration: '10 hours' },
              { type: 'article', title: 'FastAPI Documentation' },
              { type: 'project', title: 'Deploy ML Model as API' },
            ],
            skills: ['FastAPI', 'Docker', 'Model Deployment', 'MLOps'],
          },
        ],
      },
    ],
  },

  cybersecurity: {
    id: 'cybersecurity',
    title: 'Cybersecurity Specialist Roadmap',
    targetRole: 'Cybersecurity Specialist',
    estimatedDuration: '8-12 months',
    phases: [
      {
        id: 1,
        title: 'Core Foundations',
        duration: '6-8 weeks',
        modules: [
          {
            id: 1,
            title: 'Networking Fundamentals',
            duration: '3 weeks',
            difficulty: 'Beginner',
            topics: ['OSI Model', 'TCP/IP', 'DNS & HTTP', 'Firewalls', 'VPNs', 'Wireshark'],
            resources: [
              { type: 'video', title: 'CompTIA Network+ Course', duration: '20 hours' },
              { type: 'article', title: 'Networking Basics - Cisco' },
              { type: 'project', title: 'Network Packet Analysis with Wireshark' },
            ],
            skills: ['Networking', 'TCP/IP', 'Wireshark'],
          },
          {
            id: 2,
            title: 'Linux & Command Line',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['Linux Basics', 'Bash Scripting', 'File Permissions', 'Process Management', 'SSH'],
            resources: [
              { type: 'video', title: 'Linux Command Line Bootcamp', duration: '12 hours' },
              { type: 'article', title: 'Linux Journey' },
              { type: 'project', title: 'Bash Automation Script' },
            ],
            skills: ['Linux', 'Bash', 'Command Line'],
          },
        ],
      },
      {
        id: 2,
        title: 'Security Fundamentals',
        duration: '8-10 weeks',
        modules: [
          {
            id: 3,
            title: 'Web Application Security',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['OWASP Top 10', 'SQL Injection', 'XSS', 'CSRF', 'Burp Suite'],
            resources: [
              { type: 'video', title: 'Web App Pentesting Course', duration: '20 hours' },
              { type: 'article', title: 'OWASP Testing Guide' },
              { type: 'project', title: 'DVWA Lab Practice' },
            ],
            skills: ['Web Security', 'OWASP', 'Burp Suite', 'Penetration Testing'],
          },
          {
            id: 4,
            title: 'Cryptography & PKI',
            duration: '2 weeks',
            difficulty: 'Intermediate',
            topics: ['Symmetric & Asymmetric Encryption', 'Hashing', 'TLS/SSL', 'PKI'],
            resources: [
              { type: 'video', title: 'Cryptography Course', duration: '10 hours' },
              { type: 'article', title: 'Cryptography - Khan Academy' },
              { type: 'project', title: 'Implement Encryption System' },
            ],
            skills: ['Cryptography', 'SSL/TLS', 'PKI', 'Encryption'],
          },
        ],
      },
      {
        id: 3,
        title: 'Ethical Hacking',
        duration: '8-10 weeks',
        modules: [
          {
            id: 5,
            title: 'Penetration Testing',
            duration: '4 weeks',
            difficulty: 'Advanced',
            topics: ['Reconnaissance', 'Scanning', 'Exploitation', 'Post-Exploitation', 'Metasploit'],
            resources: [
              { type: 'video', title: 'Ethical Hacking Course', duration: '35 hours' },
              { type: 'article', title: 'TryHackMe Rooms' },
              { type: 'project', title: 'Capture The Flag (CTF)' },
            ],
            skills: ['Metasploit', 'Penetration Testing', 'Ethical Hacking', 'Nmap'],
          },
          {
            id: 6,
            title: 'Digital Forensics & IR',
            duration: '2 weeks',
            difficulty: 'Advanced',
            topics: ['Forensics Basics', 'Memory Analysis', 'Log Analysis', 'Incident Response'],
            resources: [
              { type: 'video', title: 'Digital Forensics Course', duration: '15 hours' },
              { type: 'article', title: 'SANS Forensics Resources' },
              { type: 'project', title: 'Forensics Challenge' },
            ],
            skills: ['Digital Forensics', 'Incident Response', 'Log Analysis'],
          },
        ],
      },
      {
        id: 4,
        title: 'Certifications & Career',
        duration: '4-6 weeks',
        modules: [
          {
            id: 7,
            title: 'Security+ & CEH Prep',
            duration: '4 weeks',
            difficulty: 'Advanced',
            topics: ['Security+ Domains', 'CEH Concepts', 'Practice Exams', 'Portfolio Building'],
            resources: [
              { type: 'video', title: 'Security+ Study Guide', duration: '30 hours' },
              { type: 'article', title: 'CEH Official Study Guide' },
              { type: 'project', title: 'Security Audit Report' },
            ],
            skills: ['CompTIA Security+', 'CEH', 'Risk Management'],
          },
        ],
      },
    ],
  },

  blockchain: {
    id: 'blockchain',
    title: 'Blockchain Developer Roadmap',
    targetRole: 'Blockchain Developer',
    estimatedDuration: '6-9 months',
    phases: [
      {
        id: 1,
        title: 'Web3 Foundations',
        duration: '4-6 weeks',
        modules: [
          {
            id: 1,
            title: 'Blockchain Fundamentals',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['How Blockchain Works', 'Consensus Mechanisms', 'Cryptography Basics', 'Bitcoin & Ethereum'],
            resources: [
              { type: 'video', title: 'Blockchain Fundamentals', duration: '8 hours' },
              { type: 'article', title: 'Bitcoin Whitepaper' },
              { type: 'project', title: 'Simple Blockchain in Python' },
            ],
            skills: ['Blockchain', 'Cryptography', 'Consensus Mechanisms'],
          },
          {
            id: 2,
            title: 'Solidity Basics',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['Solidity Syntax', 'Data Types', 'Functions', 'Events', 'ERC Standards'],
            resources: [
              { type: 'video', title: 'Solidity Course for Beginners', duration: '15 hours' },
              { type: 'article', title: 'Solidity Documentation' },
              { type: 'project', title: 'Simple Token Contract' },
            ],
            skills: ['Solidity', 'Smart Contracts', 'ERC-20'],
          },
        ],
      },
      {
        id: 2,
        title: 'Smart Contract Development',
        duration: '8-10 weeks',
        modules: [
          {
            id: 3,
            title: 'Advanced Solidity & Security',
            duration: '4 weeks',
            difficulty: 'Intermediate',
            topics: ['Gas Optimization', 'Security Patterns', 'Re-entrancy', 'OpenZeppelin', 'Testing'],
            resources: [
              { type: 'video', title: 'Advanced Solidity', duration: '20 hours' },
              { type: 'article', title: 'Smart Contract Security' },
              { type: 'project', title: 'Secure ERC-20 Token' },
            ],
            skills: ['OpenZeppelin', 'Smart Contract Security', 'Gas Optimization'],
          },
          {
            id: 4,
            title: 'Hardhat & Testing',
            duration: '2 weeks',
            difficulty: 'Intermediate',
            topics: ['Hardhat Setup', 'Testing with Mocha', 'Deployment Scripts', 'Ethers.js'],
            resources: [
              { type: 'video', title: 'Hardhat Tutorial', duration: '8 hours' },
              { type: 'article', title: 'Hardhat Documentation' },
              { type: 'project', title: 'Test Suite for Smart Contracts' },
            ],
            skills: ['Hardhat', 'Ethers.js', 'Smart Contract Testing'],
          },
        ],
      },
      {
        id: 3,
        title: 'DApp Development',
        duration: '6-8 weeks',
        modules: [
          {
            id: 5,
            title: 'Web3.js & Frontend',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Web3.js', 'MetaMask Integration', 'React + Web3', 'IPFS', 'Wallet Connect'],
            resources: [
              { type: 'video', title: 'Build a DApp with React', duration: '15 hours' },
              { type: 'article', title: 'Web3.js Documentation' },
              { type: 'project', title: 'NFT Marketplace Frontend' },
            ],
            skills: ['Web3.js', 'MetaMask', 'DApp Development', 'IPFS'],
          },
          {
            id: 6,
            title: 'DeFi & NFTs',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['DeFi Protocols', 'AMMs', 'NFT Standards', 'ERC-721', 'ERC-1155'],
            resources: [
              { type: 'video', title: 'DeFi Development Course', duration: '20 hours' },
              { type: 'article', title: 'DeFi Developer Guide' },
              { type: 'project', title: 'NFT Collection Smart Contract' },
            ],
            skills: ['DeFi', 'NFTs', 'ERC-721', 'AMM'],
          },
        ],
      },
      {
        id: 4,
        title: 'Portfolio & Job Prep',
        duration: '3-4 weeks',
        modules: [
          {
            id: 7,
            title: 'Portfolio & Interview Prep',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Portfolio Building', 'Protocol Design', 'Audit Basics', 'Technical Interviews'],
            resources: [
              { type: 'video', title: 'Blockchain Interview Prep', duration: '5 hours' },
              { type: 'article', title: 'Blockchain Portfolio Guide' },
              { type: 'project', title: 'Full DApp Project' },
            ],
            skills: ['Portfolio', 'Protocol Design', 'Technical Communication'],
          },
        ],
      },
    ],
  },

  'data-engineer': {
    id: 'data-engineer',
    title: 'Data Engineer Roadmap',
    targetRole: 'Data Engineer',
    estimatedDuration: '7-9 months',
    phases: [
      {
        id: 1,
        title: 'Data Engineering Foundations',
        duration: '4-6 weeks',
        modules: [
          {
            id: 1,
            title: 'SQL & Database Design',
            duration: '3 weeks',
            difficulty: 'Beginner',
            topics: ['SQL Basics', 'Joins & Subqueries', 'Indexing', 'Query Optimization', 'Database Design'],
            resources: [
              { type: 'video', title: 'SQL Complete Course', duration: '20 hours' },
              { type: 'article', title: 'Mode SQL Tutorial' },
              { type: 'project', title: 'E-commerce Database Schema' },
            ],
            skills: ['SQL', 'PostgreSQL', 'Database Design', 'Query Optimization'],
          },
          {
            id: 2,
            title: 'Python for Data Engineering',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['Python Basics', 'File I/O', 'Pandas', 'Data Cleaning', 'Scripting'],
            resources: [
              { type: 'video', title: 'Python for Data Engineering', duration: '10 hours' },
              { type: 'article', title: 'Pandas Documentation' },
              { type: 'project', title: 'Data Cleaning Pipeline' },
            ],
            skills: ['Python', 'Pandas', 'Data Processing'],
          },
        ],
      },
      {
        id: 2,
        title: 'ETL & Data Pipelines',
        duration: '6-8 weeks',
        modules: [
          {
            id: 3,
            title: 'ETL Development',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['ETL Concepts', 'Apache Airflow', 'Data Transformation', 'Scheduling', 'DAGs'],
            resources: [
              { type: 'video', title: 'Apache Airflow Tutorial', duration: '15 hours' },
              { type: 'article', title: 'Airflow Documentation' },
              { type: 'project', title: 'Build ETL Pipeline with Airflow' },
            ],
            skills: ['Apache Airflow', 'ETL', 'Data Pipelines'],
          },
          {
            id: 4,
            title: 'Data Warehousing',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['Data Warehouse Concepts', 'Star Schema', 'Snowflake', 'BigQuery', 'dbt'],
            resources: [
              { type: 'video', title: 'Data Warehousing Course', duration: '12 hours' },
              { type: 'article', title: 'Kimball Data Warehouse' },
              { type: 'project', title: 'Analytics Data Warehouse' },
            ],
            skills: ['Data Warehousing', 'BigQuery', 'Snowflake', 'dbt'],
          },
        ],
      },
      {
        id: 3,
        title: 'Big Data Technologies',
        duration: '6-8 weeks',
        modules: [
          {
            id: 5,
            title: 'Apache Spark',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Spark Architecture', 'RDDs', 'DataFrames', 'Spark SQL', 'Streaming'],
            resources: [
              { type: 'video', title: 'Apache Spark Course', duration: '20 hours' },
              { type: 'article', title: 'Spark Documentation' },
              { type: 'project', title: 'Large-scale Data Processing' },
            ],
            skills: ['Apache Spark', 'PySpark', 'Big Data'],
          },
          {
            id: 6,
            title: 'Cloud Data Platforms',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['AWS S3 & Glue', 'GCP BigQuery', 'Azure Data Factory', 'Kafka', 'Real-time Streaming'],
            resources: [
              { type: 'video', title: 'Cloud Data Engineering', duration: '15 hours' },
              { type: 'article', title: 'AWS Data Engineering Guide' },
              { type: 'project', title: 'Real-time Streaming Pipeline' },
            ],
            skills: ['AWS', 'Apache Kafka', 'Cloud Platforms', 'Streaming'],
          },
        ],
      },
      {
        id: 4,
        title: 'Portfolio & Certifications',
        duration: '3-4 weeks',
        modules: [
          {
            id: 7,
            title: 'Capstone & Interview Prep',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Portfolio Projects', 'System Design', 'Data Architecture', 'Certifications'],
            resources: [
              { type: 'video', title: 'Data Engineering Interview Prep', duration: '8 hours' },
              { type: 'article', title: 'Data Engineering Portfolio Guide' },
              { type: 'project', title: 'End-to-End Data Platform' },
            ],
            skills: ['System Design', 'Portfolio', 'Data Architecture'],
          },
        ],
      },
    ],
  },

  'mobile-dev': {
    id: 'mobile-dev',
    title: 'Mobile Developer Roadmap',
    targetRole: 'Mobile Developer',
    estimatedDuration: '6-8 months',
    phases: [
      {
        id: 1,
        title: 'JavaScript & React Foundations',
        duration: '4-6 weeks',
        modules: [
          {
            id: 1,
            title: 'JavaScript Mastery',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['JavaScript Fundamentals', 'ES6+', 'Promises & Async', 'Array Methods', 'OOP'],
            resources: [
              { type: 'video', title: 'JavaScript Mastery Course', duration: '15 hours' },
              { type: 'article', title: 'JavaScript.info' },
              { type: 'project', title: 'JavaScript Mini Projects' },
            ],
            skills: ['JavaScript', 'ES6+', 'Async Programming'],
          },
          {
            id: 2,
            title: 'React Basics',
            duration: '2 weeks',
            difficulty: 'Beginner',
            topics: ['Components', 'Props & State', 'Hooks', 'Lists & Keys', 'Forms'],
            resources: [
              { type: 'video', title: 'React Crash Course', duration: '10 hours' },
              { type: 'article', title: 'React Documentation' },
              { type: 'project', title: 'Weather App in React' },
            ],
            skills: ['React', 'Hooks', 'State Management'],
          },
        ],
      },
      {
        id: 2,
        title: 'React Native Core',
        duration: '6-8 weeks',
        modules: [
          {
            id: 3,
            title: 'React Native Fundamentals',
            duration: '3 weeks',
            difficulty: 'Intermediate',
            topics: ['RN Setup', 'Core Components', 'StyleSheet', 'Flexbox in RN', 'Platform API', 'Expo'],
            resources: [
              { type: 'video', title: 'React Native Complete Guide', duration: '30 hours' },
              { type: 'article', title: 'React Native Documentation' },
              { type: 'project', title: 'Expense Tracker App' },
            ],
            skills: ['React Native', 'Expo', 'Mobile UI'],
          },
          {
            id: 4,
            title: 'Navigation & State Management',
            duration: '2 weeks',
            difficulty: 'Intermediate',
            topics: ['React Navigation', 'Stack & Tab Navigation', 'Redux Toolkit', 'Async Storage'],
            resources: [
              { type: 'video', title: 'React Navigation Masterclass', duration: '8 hours' },
              { type: 'article', title: 'React Navigation Docs' },
              { type: 'project', title: 'Multi-screen App' },
            ],
            skills: ['React Navigation', 'Redux', 'Async Storage'],
          },
        ],
      },
      {
        id: 3,
        title: 'Advanced Mobile Features',
        duration: '6-8 weeks',
        modules: [
          {
            id: 5,
            title: 'Native APIs & Hardware',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Camera', 'GPS & Maps', 'Push Notifications', 'Biometrics', 'Background Tasks'],
            resources: [
              { type: 'video', title: 'Advanced React Native', duration: '15 hours' },
              { type: 'article', title: 'Expo SDK Documentation' },
              { type: 'project', title: 'Location-based App' },
            ],
            skills: ['Native APIs', 'Push Notifications', 'GPS', 'Camera'],
          },
          {
            id: 6,
            title: 'Performance & Publishing',
            duration: '2 weeks',
            difficulty: 'Advanced',
            topics: ['Performance Optimization', 'App Store Publishing', 'Play Store Publishing', 'OTA Updates'],
            resources: [
              { type: 'video', title: 'App Store Submission Guide', duration: '5 hours' },
              { type: 'article', title: 'Google Play Publishing Guide' },
              { type: 'project', title: 'Publish App to App Store' },
            ],
            skills: ['App Publishing', 'Performance Optimization', 'App Store'],
          },
        ],
      },
      {
        id: 4,
        title: 'Portfolio & Job Prep',
        duration: '3-4 weeks',
        modules: [
          {
            id: 7,
            title: 'Portfolio & Interview',
            duration: '3 weeks',
            difficulty: 'Advanced',
            topics: ['Portfolio Apps', 'Mobile Interview Prep', 'System Design for Mobile', 'Cross-platform'],
            resources: [
              { type: 'video', title: 'Mobile Dev Interview Prep', duration: '5 hours' },
              { type: 'article', title: 'Mobile Portfolio Guide' },
              { type: 'project', title: '3 Portfolio Apps' },
            ],
            skills: ['Portfolio', 'Technical Interviews', 'System Design'],
          },
        ],
      },
    ],
  },
}

// ── Compact builder for additional career roadmaps ──
// Keeps the remaining paths concise while producing the full CareerRoadmap shape.
type ModSpec = [title: string, difficulty: Module['difficulty'], duration: string, topics: string[], skills: string[]]
type PhaseSpec = [title: string, duration: string, mods: ModSpec[]]

function buildRoadmap(id: string, role: string, estimatedDuration: string, phaseSpecs: PhaseSpec[]): CareerRoadmap {
  let moduleId = 0
  const phases: Phase[] = phaseSpecs.map(([title, duration, mods], pi) => ({
    id: pi + 1,
    title,
    duration,
    modules: mods.map(([mTitle, difficulty, mDuration, topics, skills]) => ({
      id: ++moduleId,
      title: mTitle,
      duration: mDuration,
      difficulty,
      topics,
      resources: [
        { type: 'video' as const, title: `${mTitle} — Video Course`, duration: '5 hours' },
        { type: 'article' as const, title: `${mTitle} — Docs & Guide` },
        { type: 'project' as const, title: `${mTitle} Hands-on Project` },
      ],
      skills,
    })),
  }))
  return { id, title: `${role} Roadmap`, targetRole: role, estimatedDuration, phases }
}

Object.assign(roadmaps, {
  devops: buildRoadmap('devops', 'DevOps Engineer', '5-7 months', [
    ['Foundations', '4-6 weeks', [
      ['Linux & Shell Scripting', 'Beginner', '2 weeks', ['Linux CLI', 'Bash Scripting', 'File Permissions', 'Process Management'], ['Linux', 'Bash']],
      ['Networking & Git', 'Beginner', '2 weeks', ['TCP/IP', 'DNS & HTTP', 'Git Workflows', 'Branching Strategies'], ['Networking', 'Git']],
    ]],
    ['Containers & CI/CD', '6-8 weeks', [
      ['Docker & Containers', 'Intermediate', '3 weeks', ['Images', 'Containers', 'Dockerfile', 'Docker Compose'], ['Docker']],
      ['Kubernetes', 'Advanced', '3 weeks', ['Pods', 'Deployments', 'Services', 'Helm Charts'], ['Kubernetes']],
      ['CI/CD Pipelines', 'Intermediate', '2 weeks', ['GitHub Actions', 'Jenkins', 'Pipeline as Code', 'Automated Testing'], ['CI/CD']],
    ]],
    ['Cloud & Observability', '4-6 weeks', [
      ['Infrastructure as Code', 'Advanced', '3 weeks', ['Terraform', 'Ansible', 'Cloud Provisioning', 'State Management'], ['Terraform', 'IaC']],
      ['Monitoring & Observability', 'Intermediate', '2 weeks', ['Prometheus', 'Grafana', 'Centralized Logging', 'Alerting'], ['Monitoring']],
    ]],
  ]),
  'ui-ux': buildRoadmap('ui-ux', 'UI/UX Designer', '4-6 months', [
    ['Design Foundations', '4-6 weeks', [
      ['Design Principles', 'Beginner', '2 weeks', ['Color Theory', 'Typography', 'Layout', 'Visual Hierarchy'], ['Design Principles']],
      ['User Research', 'Beginner', '2 weeks', ['Interviews', 'Personas', 'Journey Maps', 'Usability Testing'], ['User Research']],
    ]],
    ['Tools & Prototyping', '5-7 weeks', [
      ['Figma Mastery', 'Intermediate', '3 weeks', ['Frames & Grids', 'Components', 'Auto Layout', 'Variants'], ['Figma']],
      ['Wireframing & Prototyping', 'Intermediate', '2 weeks', ['Low-fidelity Wireframes', 'High-fidelity Mockups', 'Interactive Prototypes', 'Developer Handoff'], ['Prototyping']],
    ]],
    ['Systems & Delivery', '4-5 weeks', [
      ['Design Systems', 'Advanced', '3 weeks', ['Design Tokens', 'Component Libraries', 'Accessibility', 'Documentation'], ['Design Systems', 'Accessibility']],
      ['Portfolio & Case Studies', 'Intermediate', '2 weeks', ['Case Study Writing', 'Portfolio Site', 'Presentation', 'Interview Prep'], ['Portfolio']],
    ]],
  ]),
  'cloud-architect': buildRoadmap('cloud-architect', 'Cloud Architect', '6-8 months', [
    ['Cloud Foundations', '5-6 weeks', [
      ['Cloud Fundamentals', 'Beginner', '2 weeks', ['Compute', 'Storage', 'Networking', 'IAM'], ['AWS']],
      ['Core AWS Services', 'Intermediate', '3 weeks', ['EC2', 'S3', 'VPC', 'Lambda'], ['AWS', 'Serverless']],
    ]],
    ['Architecture', '6-8 weeks', [
      ['Scalable Architecture', 'Advanced', '3 weeks', ['Load Balancing', 'Auto Scaling', 'Microservices', 'Caching'], ['Microservices']],
      ['Security & Networking', 'Advanced', '3 weeks', ['VPC Design', 'Security Groups', 'Encryption', 'Compliance'], ['Cloud Security']],
    ]],
    ['Advanced Delivery', '4-6 weeks', [
      ['Infrastructure as Code', 'Advanced', '3 weeks', ['Terraform', 'CloudFormation', 'Modules', 'State Management'], ['IaC', 'Terraform']],
      ['Cost & Reliability', 'Intermediate', '2 weeks', ['Cost Optimization', 'High Availability', 'Disaster Recovery', 'Monitoring'], ['Cost Optimization']],
    ]],
  ]),
  'game-dev': buildRoadmap('game-dev', 'Game Developer', '6-8 months', [
    ['Foundations', '4-6 weeks', [
      ['Game Dev Basics', 'Beginner', '2 weeks', ['Game Loop', '2D Math', 'Vectors', 'Input Handling'], ['Game Design']],
      ['C# Programming', 'Beginner', '3 weeks', ['Syntax', 'OOP', 'Coroutines', 'Events'], ['C#']],
    ]],
    ['Engine & Mechanics', '6-8 weeks', [
      ['Unity Fundamentals', 'Intermediate', '3 weeks', ['Scenes', 'GameObjects', 'Components', 'Prefabs'], ['Unity']],
      ['Physics & Animation', 'Intermediate', '3 weeks', ['Rigidbodies', 'Colliders', 'Animator', 'State Machines'], ['Physics', 'Animation']],
    ]],
    ['Build & Ship', '4-6 weeks', [
      ['Gameplay Systems', 'Advanced', '3 weeks', ['Enemy AI', 'Pathfinding', 'Game UI', 'Save Systems'], ['Gameplay Programming']],
      ['Polish & Publish', 'Advanced', '2 weeks', ['Optimization', 'Shaders', 'Builds', 'Store Submission'], ['Optimization']],
    ]],
  ]),
  frontend: buildRoadmap('frontend', 'Frontend Developer', '4-6 months', [
    ['Web Foundations', '4-5 weeks', [
      ['HTML & CSS Fundamentals', 'Beginner', '2 weeks', ['HTML5 Semantics', 'CSS Flexbox & Grid', 'Responsive Design', 'CSS Variables'], ['HTML5', 'CSS3', 'Responsive Design']],
      ['JavaScript Essentials', 'Beginner', '3 weeks', ['ES6+ Syntax', 'DOM Manipulation', 'Async/Await', 'Fetch API'], ['JavaScript', 'ES6+', 'DOM']],
    ]],
    ['Modern Frontend', '6-8 weeks', [
      ['React Fundamentals', 'Intermediate', '3 weeks', ['Components & Props', 'Hooks', 'State Management', 'React Router'], ['React', 'Hooks', 'React Router']],
      ['TypeScript & Tooling', 'Intermediate', '2 weeks', ['Type Annotations', 'Generics', 'Vite & Bundlers', 'ESLint & Prettier'], ['TypeScript', 'Vite']],
      ['Styling at Scale', 'Intermediate', '2 weeks', ['Tailwind CSS', 'CSS Modules', 'Design Tokens', 'Component Libraries'], ['Tailwind CSS', 'Design Systems']],
    ]],
    ['Production Frontend', '5-6 weeks', [
      ['Next.js & Rendering', 'Advanced', '3 weeks', ['App Router', 'Server Components', 'Data Fetching', 'SEO & Metadata'], ['Next.js', 'SSR', 'SEO']],
      ['Testing & Performance', 'Advanced', '2 weeks', ['Vitest & Testing Library', 'Playwright E2E', 'Core Web Vitals', 'Accessibility'], ['Testing', 'Web Performance', 'Accessibility']],
    ]],
    ['Portfolio & Job Prep', '2-3 weeks', [
      ['Portfolio & Interview', 'Intermediate', '2 weeks', ['Portfolio Site', 'Frontend Interview Questions', 'System Design (Frontend)', 'Live Coding'], ['Portfolio', 'Technical Interviews']],
    ]],
  ]),
  backend: buildRoadmap('backend', 'Backend Developer', '5-7 months', [
    ['Programming Foundations', '4-5 weeks', [
      ['JavaScript & Node.js Basics', 'Beginner', '3 weeks', ['ES6+ Syntax', 'Node.js Runtime', 'npm & Modules', 'Async Patterns'], ['JavaScript', 'Node.js']],
      ['Git & Linux Basics', 'Beginner', '1 week', ['Git Workflows', 'Linux CLI', 'Environment Variables', 'Shell Scripting'], ['Git', 'Linux']],
    ]],
    ['APIs & Databases', '6-8 weeks', [
      ['REST APIs with Express', 'Intermediate', '3 weeks', ['Routing & Middleware', 'Validation', 'Error Handling', 'Authentication (JWT)'], ['Express.js', 'REST APIs', 'JWT']],
      ['Databases', 'Intermediate', '3 weeks', ['SQL & PostgreSQL', 'MongoDB', 'Indexing', 'Schema Design'], ['PostgreSQL', 'MongoDB', 'Database Design']],
    ]],
    ['Scalable Backends', '6-8 weeks', [
      ['Caching & Queues', 'Advanced', '2 weeks', ['Redis', 'Message Queues', 'Background Jobs', 'Rate Limiting'], ['Redis', 'Message Queues']],
      ['Architecture & Security', 'Advanced', '3 weeks', ['Microservices', 'OWASP Top 10', 'Logging & Monitoring', 'API Design'], ['System Design', 'Security', 'Microservices']],
      ['Docker & Deployment', 'Advanced', '2 weeks', ['Docker', 'CI/CD Pipelines', 'Cloud Deployment', 'Environment Config'], ['Docker', 'CI/CD', 'Cloud Deployment']],
    ]],
    ['Portfolio & Job Prep', '2-3 weeks', [
      ['Portfolio & Interview', 'Intermediate', '2 weeks', ['Backend Project', 'System Design Interviews', 'DSA Refresher', 'Behavioral Interviews'], ['Portfolio', 'Technical Interviews', 'System Design']],
    ]],
  ]),
  qa: buildRoadmap('qa', 'QA Engineer', '4-6 months', [
    ['Testing Foundations', '3-4 weeks', [
      ['Software Testing Basics', 'Beginner', '2 weeks', ['SDLC & STLC', 'Test Cases & Plans', 'Bug Life Cycle', 'Manual Testing'], ['Manual Testing', 'Test Planning']],
      ['Programming for Testers', 'Beginner', '2 weeks', ['JavaScript Basics', 'Git', 'HTML/CSS Selectors', 'HTTP & APIs'], ['JavaScript', 'Git']],
    ]],
    ['Test Automation', '6-8 weeks', [
      ['Web Automation', 'Intermediate', '3 weeks', ['Playwright', 'Selenium', 'Page Object Model', 'Cross-browser Testing'], ['Playwright', 'Selenium', 'Test Automation']],
      ['API & Unit Testing', 'Intermediate', '3 weeks', ['Postman', 'REST API Testing', 'Jest / Vitest', 'Mocking'], ['API Testing', 'Jest']],
    ]],
    ['Quality at Scale', '4-6 weeks', [
      ['CI/CD & Performance', 'Advanced', '3 weeks', ['GitHub Actions', 'Test Reporting', 'k6 Load Testing', 'Flaky Test Management'], ['CI/CD', 'Performance Testing']],
      ['Security & Accessibility Testing', 'Advanced', '2 weeks', ['OWASP Basics', 'Accessibility Audits', 'Mobile Testing', 'Exploratory Testing'], ['Security Testing', 'Accessibility']],
    ]],
    ['Portfolio & Job Prep', '2 weeks', [
      ['Portfolio & Interview', 'Intermediate', '2 weeks', ['Automation Framework Project', 'QA Interview Questions', 'Test Strategy Docs', 'Behavioral Interviews'], ['Portfolio', 'Technical Interviews']],
    ]],
  ]),
  'product-manager': buildRoadmap('product-manager', 'Product Manager', '4-6 months', [
    ['Product Foundations', '3-4 weeks', [
      ['Product Thinking', 'Beginner', '2 weeks', ['Product Lifecycle', 'User Personas', 'Problem Framing', 'Value Proposition'], ['Product Thinking', 'User Research']],
      ['Agile & Delivery', 'Beginner', '2 weeks', ['Scrum & Kanban', 'User Stories', 'Backlog Grooming', 'Sprint Planning'], ['Agile', 'Scrum']],
    ]],
    ['Discovery & Strategy', '6-8 weeks', [
      ['User Research & Discovery', 'Intermediate', '3 weeks', ['Interviews', 'Surveys', 'Journey Mapping', 'Jobs To Be Done'], ['User Research', 'Discovery']],
      ['Metrics & Analytics', 'Intermediate', '3 weeks', ['North Star Metrics', 'Funnels', 'A/B Testing', 'SQL Basics'], ['Product Analytics', 'A/B Testing', 'SQL']],
    ]],
    ['Execution & Leadership', '5-6 weeks', [
      ['Roadmapping & Prioritization', 'Advanced', '3 weeks', ['RICE / MoSCoW', 'OKRs', 'Roadmap Communication', 'Stakeholder Management'], ['Prioritization', 'Roadmapping', 'Stakeholder Management']],
      ['Technical Fluency', 'Advanced', '2 weeks', ['APIs & Architecture', 'System Design Basics', 'Working with Engineers', 'Tech Debt'], ['Technical Fluency']],
    ]],
    ['Portfolio & Job Prep', '2 weeks', [
      ['Case Studies & Interview', 'Intermediate', '2 weeks', ['Product Case Study', 'PM Interview Frameworks', 'Product Sense', 'Execution Questions'], ['Portfolio', 'PM Interviews']],
    ]],
  ]),
})

// ── Career catalogue ──────────────────────────────────────────────
// What the Goals picker shows. `icon` is a lucide icon *name* so this file
// stays server-safe; the client resolves it to a component.

export interface CareerPath {
  id: string
  title: string
  icon: string
  description: string
  skills: string[]
  avgPackage: string
  color: string
}

export const CAREER_PATHS: CareerPath[] = [
  { id: 'fullstack', title: 'Full Stack Developer', icon: 'Code', description: 'Build complete web applications from frontend to backend', skills: ['React', 'Node.js', 'TypeScript', 'Databases', 'REST APIs', 'GraphQL', 'HTML/CSS', 'Git'], avgPackage: '8–15 LPA', color: 'bg-blue-50 text-blue-600' },
  { id: 'frontend', title: 'Frontend Developer', icon: 'LayoutTemplate', description: 'Craft fast, accessible user interfaces for the web', skills: ['HTML/CSS', 'JavaScript', 'React', 'TypeScript', 'Next.js', 'Tailwind', 'Testing', 'Accessibility'], avgPackage: '6–14 LPA', color: 'bg-teal-50 text-teal-600' },
  { id: 'backend', title: 'Backend Developer', icon: 'Server', description: 'Design APIs, databases and the systems behind the product', skills: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'System Design', 'Security'], avgPackage: '8–16 LPA', color: 'bg-slate-100 text-slate-700' },
  { id: 'data-engineer', title: 'Data Engineer', icon: 'Database', description: 'Design and maintain data infrastructure and pipelines', skills: ['SQL', 'ETL', 'Big Data', 'Apache Spark', 'Airflow', 'Cloud Platforms', 'Python', 'Data Warehousing'], avgPackage: '10–20 LPA', color: 'bg-amber-50 text-amber-600' },
  { id: 'ai-ml', title: 'AI/ML Engineer', icon: 'Brain', description: 'Develop intelligent systems and machine learning models', skills: ['Python', 'TensorFlow', 'PyTorch', 'Deep Learning', 'NLP', 'Computer Vision', 'Statistics', 'Pandas'], avgPackage: '12–30 LPA', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'devops', title: 'DevOps Engineer', icon: 'Cloud', description: 'Automate, deploy, and scale reliable infrastructure', skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Linux', 'Monitoring', 'Bash'], avgPackage: '10–22 LPA', color: 'bg-sky-50 text-sky-600' },
  { id: 'cloud-architect', title: 'Cloud Architect', icon: 'Boxes', description: 'Design secure, scalable cloud-native systems', skills: ['AWS', 'Azure', 'GCP', 'Microservices', 'Networking', 'Security', 'Infrastructure as Code', 'Cost Optimization'], avgPackage: '15–30 LPA', color: 'bg-indigo-50 text-indigo-600' },
  { id: 'cybersecurity', title: 'Cybersecurity Specialist', icon: 'Shield', description: 'Protect systems and networks from digital attacks', skills: ['Network Security', 'Ethical Hacking', 'Cryptography', 'Penetration Testing', 'SIEM', 'Linux', 'Incident Response', 'Threat Analysis'], avgPackage: '10–18 LPA', color: 'bg-rose-50 text-rose-600' },
  { id: 'mobile-dev', title: 'Mobile Developer', icon: 'Smartphone', description: 'Create native and cross-platform mobile applications', skills: ['React Native', 'Flutter', 'iOS', 'Android', 'Kotlin', 'Swift', 'Dart', 'REST APIs'], avgPackage: '8–16 LPA', color: 'bg-cyan-50 text-cyan-600' },
  { id: 'blockchain', title: 'Blockchain Developer', icon: 'Blocks', description: 'Create decentralized applications and smart contracts', skills: ['Solidity', 'Web3', 'Smart Contracts', 'DeFi', 'Ethereum', 'Hardhat', 'Cryptography', 'Rust'], avgPackage: '12–25 LPA', color: 'bg-violet-50 text-violet-600' },
  { id: 'ui-ux', title: 'UI/UX Designer', icon: 'Palette', description: 'Design intuitive, accessible product experiences', skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Accessibility', 'Interaction Design', 'Usability Testing'], avgPackage: '6–14 LPA', color: 'bg-pink-50 text-pink-600' },
  { id: 'qa', title: 'QA Engineer', icon: 'BadgeCheck', description: 'Guarantee quality with manual and automated testing', skills: ['Manual Testing', 'Playwright', 'Selenium', 'API Testing', 'Jest', 'CI/CD', 'Performance Testing', 'Bug Tracking'], avgPackage: '5–12 LPA', color: 'bg-lime-50 text-lime-700' },
  { id: 'product-manager', title: 'Product Manager', icon: 'Compass', description: 'Own the product vision, roadmap and outcomes', skills: ['Product Thinking', 'User Research', 'Agile', 'Analytics', 'Prioritization', 'Roadmapping', 'Stakeholder Management', 'SQL'], avgPackage: '10–25 LPA', color: 'bg-orange-50 text-orange-600' },
  { id: 'game-dev', title: 'Game Developer', icon: 'Gamepad2', description: 'Build interactive games and immersive experiences', skills: ['Unity', 'C#', 'Unreal Engine', '3D Math', 'Physics', 'Shaders', 'Animation', 'Game Design'], avgPackage: '7–18 LPA', color: 'bg-yellow-50 text-yellow-700' },
]

export const DEFAULT_CAREER_PATH = 'fullstack'

export function isCareerPath(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(roadmaps, id)
}

export function getRoadmap(careerPath: string | null | undefined): CareerRoadmap {
  return (careerPath && roadmaps[careerPath]) || roadmaps[DEFAULT_CAREER_PATH]
}

export function careerTitle(careerPath: string): string {
  return CAREER_PATHS.find(c => c.id === careerPath)?.title ?? getRoadmap(careerPath).targetRole
}

/** Every module of a roadmap in learning order (phase by phase). */
export function allModules(roadmap: CareerRoadmap): Module[] {
  return roadmap.phases.flatMap(p => p.modules)
}

export function findModule(roadmap: CareerRoadmap, moduleId: number): Module | null {
  return allModules(roadmap).find(m => m.id === moduleId) ?? null
}

/** Id of the module after `moduleId`, or null when it is the last one. */
export function nextModuleId(roadmap: CareerRoadmap, moduleId: number): number | null {
  const mods = allModules(roadmap)
  const idx = mods.findIndex(m => m.id === moduleId)
  if (idx === -1 || idx >= mods.length - 1) return null
  return mods[idx + 1].id
}

// The signup form asks for a `targetRole` (components/signup/data.ts). Map it
// to a roadmap so a student who hasn't set goals yet gets a sensible default.
const TARGET_ROLE_TO_PATH: Record<string, string> = {
  'frontend developer': 'frontend',
  'backend developer': 'backend',
  'full stack developer': 'fullstack',
  'data engineer': 'data-engineer',
  'product manager': 'product-manager',
  designer: 'ui-ux',
  'ui/ux designer': 'ui-ux',
  'devops engineer': 'devops',
  'qa engineer': 'qa',
}

export function careerPathForTargetRole(targetRole: string | null | undefined): string | null {
  if (!targetRole) return null
  const key = targetRole.trim().toLowerCase()
  if (TARGET_ROLE_TO_PATH[key]) return TARGET_ROLE_TO_PATH[key]
  // Fall back to matching the roadmap's own role title.
  const hit = CAREER_PATHS.find(c => c.title.toLowerCase() === key)
  return hit?.id ?? null
}
