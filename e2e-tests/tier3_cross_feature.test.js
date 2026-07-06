const assert = require('assert').strict;
const {
  request,
  resetDatabases,
  computeStats,
  getRecommendations,
  generateComplaint
} = require('./helpers');

module.exports = [
  {
    id: 61,
    name: "Submission -> Map -> Issues Hub integration",
    fn: async () => {
      await resetDatabases();

      // Submit a complaint in West Suburbs
      const submitRes = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({
          text: 'Pothole on West Suburbs street.',
          region: 'West Suburbs',
          coordinates: { x: 250, y: 750 }
        })
      });
      assert.equal(submitRes.status, 201);
      assert.equal(submitRes.body.region, 'West Suburbs');

      // Issues Hub fetches complaints and filters by region
      const fetchRes = await request('/api/complaints');
      assert.equal(fetchRes.status, 200);

      const westSuburbsComplaints = fetchRes.body.filter(c => c.region === 'West Suburbs');
      assert(westSuburbsComplaints.length >= 1);
      
      const found = westSuburbsComplaints.find(c => c.id === submitRes.body.id);
      assert.ok(found);
      assert.equal(found.coordinates.x, 250);
      assert.equal(found.coordinates.y, 750);
    }
  },
  {
    id: 62,
    name: "Submission -> Stats -> Recommendations integration",
    fn: async () => {
      await resetDatabases();

      // Submit a critical urgency complaint in North Ward
      const compRes = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({
          text: 'Power wire grid explosion and imminent fire in North Ward!',
          region: 'North Ward'
        })
      });
      assert.equal(compRes.status, 201);
      assert.equal(compRes.body.urgency, 'Critical');

      // Fetch state
      const complaints = await request('/api/complaints');
      const projects = await request('/api/projects');

      // Verify stats update
      const stats = computeStats(complaints.body, projects.body);
      assert.equal(stats.urgencyCounts.Critical, 1);

      // Verify AI recommendation matches urgency
      const recommendations = getRecommendations(complaints.body, projects.body);
      const northWardProject = recommendations.find(p => p.region === 'North Ward');
      assert.ok(northWardProject);
      assert.equal(northWardProject.urgency, 'Critical');
    }
  },
  {
    id: 63,
    name: "Project Progress -> Dashboard Stats integration",
    fn: async () => {
      await resetDatabases();

      const initialComps = await request('/api/complaints');
      const initialProjs = await request('/api/projects');
      const statsBefore = computeStats(initialComps.body, initialProjs.body);

      // Complete proj-3 (currently In Progress)
      const patchRes = await request('/api/projects/proj-3/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(patchRes.status, 200);

      const updatedProjs = await request('/api/projects');
      const statsAfter = computeStats(initialComps.body, updatedProjs.body);

      assert.equal(statsAfter.completedProjects, statsBefore.completedProjects + 1);
      assert.equal(statsAfter.activeProjects, statsBefore.activeProjects - 1);
    }
  },
  {
    id: 64,
    name: "Multi-complaint -> Region Heatmap integration",
    fn: async () => {
      await resetDatabases();

      // Submit multiple complaints in East District
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Water pipe leak in East District', region: 'East District' })
      });
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Another leak in East District', region: 'East District' })
      });

      const res = await request('/api/complaints');
      const eastDistrictComplaints = res.body.filter(c => c.region === 'East District');
      assert.equal(eastDistrictComplaints.length, 2);
    }
  },
  {
    id: 65,
    name: "Recommendations -> Status -> Tracker integration",
    fn: async () => {
      await resetDatabases();

      // Get recommended project (proj-1)
      const initialRes = await request('/api/projects');
      const proj = initialRes.body.find(p => p.id === 'proj-1');
      assert.equal(proj.status, 'Recommended');

      // Start it (Recommended -> Planned)
      const patchPlanned = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(patchPlanned.status, 200);

      // Track progression (Planned -> In Progress)
      const patchInProgress = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(patchInProgress.status, 200);

      const verifyRes = await request('/api/projects');
      const updatedProj = verifyRes.body.find(p => p.id === 'proj-1');
      assert.equal(updatedProj.status, 'In Progress');
    }
  },
  {
    id: 66,
    name: "Complaint Sentiment -> Recommendation integration",
    fn: async () => {
      await resetDatabases();

      // Submit a negative sentiment complaint in North Ward
      const compRes = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({
          text: 'The power lines are broken and extremely unsafe, unsafe conditions!',
          region: 'North Ward'
        })
      });
      assert.equal(compRes.status, 201);
      assert.equal(compRes.body.sentiment, 'Negative');

      // Verify recommendation escalates related project
      const complaints = await request('/api/complaints');
      const projects = await request('/api/projects');
      
      const recommendations = getRecommendations(complaints.body, projects.body);
      const northWardProject = recommendations.find(p => p.region === 'North Ward');
      assert.ok(northWardProject);
      // Urgency of complaint was High because of "broken / unsafe / lines"
      assert.equal(northWardProject.urgency, 'High');
    }
  }
];
