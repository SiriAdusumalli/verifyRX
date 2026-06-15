// import { Navigate, Route, Routes } from "react-router-dom";
// import { Layout } from "./components/Layout";
// import { ChatPage } from "./pages/ChatPage";
// import { ComparePage } from "./pages/ComparePage";
// import { DashboardPage } from "./pages/DashboardPage";
// import { LandingPage } from "./pages/LandingPage";
// import { LoginPage } from "./pages/LoginPage";
// import { SignupPage } from "./pages/SignupPage";
// import { AuthCallbackPage } from "./pages/AuthCallbackPage";
// import { ProtectedRoute } from "./components/ProtectedRoute";
// import { ResultsPage } from "./pages/ResultsPage";
// import { ScanPage } from "./pages/ScanPage";
// import { ScanResult } from "./pages/ScanResult";


// export default function App() {
//   return (
//     <Layout>  
//       <Routes>
//         <Route path="/" element={<LandingPage />} />
        
//         {/* Protected Routes */}
//         <Route 
//           path="/scan" 
//           element={
//             <ProtectedRoute>
//               <ScanPage />
//             </ProtectedRoute>
//           } 
//         />
//         <Route 
//           path="/scan-result/:medicineId" 
//           element={
//             <ProtectedRoute>
//               <ScanResult />
//             </ProtectedRoute>
//           } 
//         />
//         <Route 
//           path="/results/:id" 
//           element={
//             <ProtectedRoute>
//               <ResultsPage />
//             </ProtectedRoute>
//           } 
//         />
//         <Route 
//           path="/compare" 
//           element={
//             <ProtectedRoute>
//               <ComparePage />
//             </ProtectedRoute>
//           } 
//         />
//         <Route 
//           path="/dashboard" 
//           element={
//             <ProtectedRoute>
//               <DashboardPage />
//             </ProtectedRoute>
//           } 
//         />
//         <Route 
//           path="/chat" 
//           element={
//             <ProtectedRoute>
//               <ChatPage />
//             </ProtectedRoute>
//           } 
//         />
        
//         {/* Public Auth Routes */}
//         <Route path="/login" element={<LoginPage />} />
//         <Route path="/signup" element={<SignupPage />} />
//         <Route path="/auth/callback" element={<AuthCallbackPage />} />
        
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </Layout>
//   );
// }


import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";

import { DashboardPage } from "./pages/DashboardPage";
import { ScanPage } from "./pages/ScanPage";
import { ScanResult } from "./pages/ScanResult";
import { ResultsPage } from "./pages/ResultsPage";
import { ComparePage } from "./pages/ComparePage";
import { ChatPage } from "./pages/ChatPage";

export default function App() {
  return (
    <Layout>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Magic Link Callback */}
        <Route
          path="/auth/callback"
          element={<AuthCallbackPage />}
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan-result/:medicineId"
          element={
            <ProtectedRoute>
              <ScanResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results/:id"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <ComparePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Layout>
  );
}