import { useMemo } from 'react'
import { useCallback } from 'react';
import { extractRoleFromToken } from '../../utils/auth.js'
import MainLayout from '../../layouts/MainLayout.jsx';
import useAuth from '../../hooks/useAuth.js';
import IdeasListPage from '../staff/IdeasListPage.jsx';
import { fetchDepartmentIdeas } from '../../services/staffIdeaService.js';

const DepartmentIdeasPage = () => {
  const { accessToken, isAuthenticated } = useAuth()

  const roleValue = useMemo(() => {
    if (!accessToken) return null
    return extractRoleFromToken(accessToken)
  }, [accessToken])

  const { currentUser } = useAuth();
  const departmentId = currentUser?.departmentId ?? null;
  
  const fetchFn = useCallback(
    (params) => fetchDepartmentIdeas({ ...params, departmentId }),
    [departmentId]
  );

  return (
    <MainLayout>
      <IdeasListPage fetchFn={fetchFn} title="Department Ideas" myRole={roleValue} />
    </MainLayout>
  );
};

// export default DepartmentIdeasPage;
//           <Typography variant="body2" color="text.secondary">
//             {ideaToToggle?.statusId === 7
//               ? 'Are you sure you want to show this idea again?'
//               : 'Are you sure you want to hide this idea?'}
//           </Typography>
//         </DialogContent>
//         <DialogActions sx={{ px: 3, pb: 2.5 }}>
//           <Button onClick={handleCloseConfirm} disabled={toggling} variant="outlined" sx={{ borderRadius: 0.7 }}>
//             Cancel
//           </Button>
//           <Button
//             onClick={handleConfirmToggle}
//             disabled={toggling}
//             color={ideaToToggle?.statusId === 7 ? 'primary' : 'error'}
//             variant="contained"
//             sx={{ borderRadius: 0.7 }}
//           >
//             {toggling ? 'Updating...' : ideaToToggle?.statusId === 7 ? 'Show' : 'Hide'}
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </MainLayout>
//   );
// };

export default DepartmentIdeasPage;
