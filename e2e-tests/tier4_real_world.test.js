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
    id: 67,
    name: "MP Daily Workflow (Test 67)",
    fn: async () => {
      await resetDatabases();

      // 1. MP logs in (verifies dashboard stats can be computed)
      let complaintsRes = await request('/api/complaints');
      let projectsRes = await request('/api/projects');
      let stats = computeStats(complaintsRes.body, projectsRes.body);
      assert.equal(stats.totalComplaints, 0);

      // 2. MP clicks region on map (simulated by filtering by region 'Downtown')
      const downtownProjects = projectsRes.body.filter(p => p.region === 'Downtown');
      assert(downtownProjects.length > 0);

      // 3. MP submits mock complaint about Downtown
      const submitRes = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({
          text: 'Pothole on Downtown main road is dangerous and slow.',
          region: 'Downtown'
        })
      });
      assert.equal(submitRes.status, 201);
      assert.equal(submitRes.body.region, 'Downtown');

      // 4. MP reviews recommendations
      complaintsRes = await request('/api/complaints');
      projectsRes = await request('/api/projects');
      const recommendations = getRecommendations(complaintsRes.body, projectsRes.body);
      const downtownProjRec = recommendations.find(p => p.region === 'Downtown');
      assert.ok(downtownProjRec);

      // 5. MP starts and tracks a project (transition proj-1 in North Ward from Recommended to Planned)
      const patchPlanned = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(patchPlanned.status, 200);

      const patchActive = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(patchActive.status, 200);
      assert.equal(patchActive.body.status, 'In Progress');
    }
  },
  {
    id: 68,
    name: "Crisis Management (Test 68)",
    fn: async () => {
      await resetDatabases();

      // 1. Critical failure complaint submitted in North Ward
      const compRes = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({
          text: 'North Ward power grid explosion! Imminent fire and extreme emergency!',
          region: 'North Ward'
        })
      });
      assert.equal(compRes.status, 201);
      assert.equal(compRes.body.urgency, 'Critical');

      // 2. Dashboard shows critical urgency
      const complaintsRes = await request('/api/complaints');
      const projectsRes = await request('/api/projects');
      const stats = computeStats(complaintsRes.body, projectsRes.body);
      assert.equal(stats.urgencyCounts.Critical, 1);

      // 3. MP starts emergency project (proj-1 in North Ward goes directly to In Progress)
      const patchRes = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.status, 'In Progress');
    }
  },
  {
    id: 69,
    name: "Budget Planning Cycle (Test 69)",
    fn: async () => {
      await resetDatabases();

      // 1. MP filters low-cost projects (cost <= 50000)
      const projectsRes = await request('/api/projects');
      const lowCostProjects = projectsRes.body.filter(p => p.cost <= 50000);
      assert(lowCostProjects.length > 0);

      // 2. Upgrades a project to Planned (proj-1 cost is 120000, proj-2 cost is 85000)
      // Let's upgrade proj-1 (Recommended) to Planned
      const patchRes = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(patchRes.status, 200);

      // 3. Verifies stats counts
      const updatedProjects = await request('/api/projects');
      const stats = computeStats([], updatedProjects.body);
      assert.equal(stats.activeProjects, 3); // proj-2 (Planned) + proj-3 (In Progress) + proj-1 (Planned) = 3 active (Wait, proj-4 is Completed, proj-3 In Progress, proj-2 Planned, now proj-1 is Planned, so 3 active)
      assert.equal(stats.recommendedProjects, 0); // proj-1 went from Recommended to Planned, so 0 recommended
    }
  },
  {
    id: 70,
    name: "Citizen Engagement Feedback Loop (Test 70)",
    fn: async () => {
      await resetDatabases();

      // 1. Citizen complaint on sanitation
      const compRes = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({
          text: 'Garbage sewage overflow smell in East District',
          region: 'East District'
        })
      });
      assert.equal(compRes.status, 201);
      assert.equal(compRes.body.category, 'Sanitation');

      // 2. MP moves sanitation/water project to In Progress, then Completed
      // proj-2 is Water Pipeline Restoration in East District, status: Planned
      const patchActive = await request('/api/projects/proj-2/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(patchActive.status, 200);

      const patchComplete = await request('/api/projects/proj-2/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(patchComplete.status, 200);
      assert.equal(patchComplete.body.status, 'Completed');

      // 3. Verify resolution in stats
      const projectsRes = await request('/api/projects');
      const stats = computeStats([compRes.body], projectsRes.body);
      assert.equal(stats.completedProjects, 2); // proj-4 was completed, now proj-2 is also completed
    }
  },
  {
    id: 71,
    name: "Constituency Progress Report (Test 71)",
    fn: async () => {
      await resetDatabases();

      // 1. MP completes all projects in North Ward region (proj-1 is in North Ward)
      const patchPlanned = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(patchPlanned.status, 200);

      const patchActive = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(patchActive.status, 200);

      const patchComplete = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(patchComplete.status, 200);

      // 2. Verify all projects in North Ward are Completed
      const projectsRes = await request('/api/projects');
      const northWardProjects = projectsRes.body.filter(p => p.region === 'North Ward');
      for (const p of northWardProjects) {
        assert.equal(p.status, 'Completed');
      }
    }
  }
];
