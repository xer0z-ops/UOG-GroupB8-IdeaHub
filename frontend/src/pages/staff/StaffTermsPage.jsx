import { Box, Paper, Typography } from "@mui/material";

const sections = [
  {
    title: "1. Submission Guidelines",
    body: "By submitting an idea, you agree that your suggestion aligns with the university's core values of respect, integrity, and excellence. Submissions should be constructive, professional, and aimed at fostering positive change. Ideas containing inappropriate content, personal attacks, or discriminatory language will be immediately removed and may result in disciplinary action.",
  },
  {
    title: "2. Intellectual Property",
    body: "Ideas submitted through this platform become the shared property of the university for the purposes of evaluation, development, and implementation. However, the original author will be appropriately credited for their contribution unless they have chosen to submit their idea anonymously.",
  },
  {
    title: "3. Anonymous Submissions",
    body: "We understand that some suggestions may be sensitive. The platform provides an option to post ideas anonymously. While your identity will be hidden from other users, university administrators will still have access to submission records to ensure platform safety and accountability. We ask that the anonymity feature be used responsibly.",
  },
  {
    title: "4. Review Process",
    body: "All ideas are subject to review by department heads or designated QA coordinators. Not all submitted ideas will be implemented. The platform does not guarantee that any idea will be adopted, but all serious proposals will receive consideration.",
  },
];

const StaffTermsPage = () => (
  <Box sx={{ px: { xs: 2.5, lg: 4 }, py: { xs: 1, lg: 2 } }}>
    <Typography variant="h6" fontWeight={700} mb={1} color="#1e293b">
      University IdeaHub Terms of Service
    </Typography>
    <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
      Welcome to IdeaHub (University Academic Feedback & Idea System). We value your contributions and encourage all staff
      members to share their innovative ideas to improve our campus community, academic processes,
      and administrative workflows.
    </Typography>

    {sections.map((section) => (
      <Box key={section.title}>
        <Typography variant="subtitle1" fontWeight={600} mt={4} mb={1.5} color="#1e293b">
          {section.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          {section.body}
        </Typography>
      </Box>
    ))}
  </Box>

);

export default StaffTermsPage;
