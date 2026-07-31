/* Shared research facts for Console / Pillars / Case studies */
window.ResearchData = {
  umbrella: 'AI in Medical Imaging & Healthcare Data',
  tagline:
    'From neuroimaging quantification and digital twins to surgical vision and trustworthy clinical data pipelines.',

  stages: [
    {
      id: 'segment',
      label: 'Segment',
      region: 'cortex',
      title: 'LEON Brain Segmentation',
      desc: 'MR-based deep learning parcellation for amyloid PET — diagnostic performance aligned with FreeSurfer across multi-site cohorts.',
      metrics: [
        { label: 'Reference', value: 'FreeSurfer', hint: 'equivalence target' },
        { label: 'Modality', value: 'PET / MRI', hint: 'MR-guided ROIs' },
        { label: 'Stack', value: 'TensorFlow', hint: 'DL segmentation' },
        { label: 'Status', value: 'In prep', hint: 'EJNMMI Physics' }
      ]
    },
    {
      id: 'coreg',
      label: 'Co-register',
      region: 'midline',
      title: 'TCBC Motion Correction',
      desc: 'Tracer characteristic–based co-registration for simultaneous PET/MR — reduces misalignment before quantification.',
      metrics: [
        { label: 'Target', value: 'PET / MR', hint: 'simultaneous scans' },
        { label: 'Method', value: 'TCBC', hint: 'tracer-aware' },
        { label: 'Outlet', value: 'EJNMMI', hint: 'Jul 2025' },
        { label: 'Stack', value: 'MATLAB', hint: 'registration' }
      ]
    },
    {
      id: 'quantify',
      label: 'Quantify',
      region: 'frontal',
      title: 'MRI-less Amyloid PET',
      desc: 'Deep learning quantification without MRI using synthetic CT for training — robust on external PET/CT cohorts.',
      metrics: [
        { label: 'Path', value: 'MRI-less', hint: 'synthetic CT train' },
        { label: 'Scale', value: 'Centiloid', hint: 'SUVR → CL' },
        { label: 'Outlet', value: 'EJNMMI', hint: 'Mar 2026' },
        { label: 'Stack', value: 'PyTorch', hint: 'DL pipeline' }
      ]
    },
    {
      id: 'validate',
      label: 'Validate',
      region: 'global',
      title: 'Trustworthy Evaluation',
      desc: 'Multi-site cohorts, equivalence testing, ROC / bootstrap — quantification that clinicians can defend.',
      metrics: [
        { label: 'Design', value: 'Multi-site', hint: 'external check' },
        { label: 'Stats', value: 'ROC + EQ', hint: 'bootstrap' },
        { label: 'Focus', value: 'Amyloid', hint: 'AD continuum' },
        { label: 'Ethic', value: 'Trust', hint: 'clinical use' }
      ]
    }
  ],

  pillars: [
    {
      id: 'imaging',
      index: '01',
      label: 'Imaging Intelligence',
      title: 'Neuroimaging Intelligence',
      desc: 'Quantitative imaging across PET, MRI, and fMRI — from amyloid PET segmentation and motion correction to generative neuroimaging and brain digital twins.',
      chips: [
        { label: 'LEON', href: 'work/leon-segmentation.html' },
        { label: 'MRI-less PET', href: 'work/mri-less-amyloid.html' },
        { label: 'PET · MRI · fMRI', href: 'cv.html#experience' },
        { label: 'EJNMMI', href: 'cv.html#publications' }
      ]
    },
    {
      id: 'vision',
      index: '02',
      label: 'Clinical Co-vision',
      title: 'Real-time Surgical Co-vision',
      desc: 'Computer vision that works alongside the surgical team: real-time video segmentation, detection, and visibility-aware tracking for robotic surgery.',
      chips: [
        { label: 'Real-time segmentation', href: 'cv.html#experience' },
        { label: 'DaVinci robotics', href: 'about.html#journey' }
      ]
    },
    {
      id: 'data',
      index: '03',
      label: 'Trustworthy Health Data',
      title: 'Trustworthy Healthcare Data',
      desc: 'Healthcare data de-identification and disclosure-risk assessment — systems designed to remain useful, accountable, and governable.',
      chips: [
        { label: 'De-identification', href: 'about.html#philosophy' },
        { label: 'Sovereign AI', href: 'about.html#journey' }
      ]
    }
  ],

  compare: {
    left: {
      label: 'MRI-based',
      title: 'Structural MRI + PET',
      body: 'Classical path: segment anatomy on MRI, project PET uptake, report SUVR / Centiloid against FreeSurfer-grade ROIs.',
      punch: 'Gold-standard anatomy — when MRI is available.'
    },
    right: {
      label: 'MRI-less',
      title: 'Synthetic CT + PET/CT',
      body: 'DL path trained with synthetic CT: quantify amyloid burden without a paired MRI, validated on external PET/CT cohorts.',
      punch: 'Access when MRI is missing — without giving up defensibility.'
    }
  },

  projects: {
    leon: {
      num: '01',
      title: 'LEON Brain Segmentation',
      problem: 'Amyloid PET quantification needs reliable cortical ROIs. Manual or slow FreeSurfer pipelines limit scale.',
      method: ['MRI input', 'DL parcellation', 'PET projection', 'SUVR / CL'],
      methodNotes: [
        'T1-weighted MRI defines anatomical space.',
        'LEON predicts cortical / reference ROIs.',
        'PET is sampled in native or warped space.',
        'Outputs diagnostic metrics aligned with FreeSurfer.'
      ],
      numbers: [
        { label: 'Reference', value: 'FreeSurfer' },
        { label: 'Focus', value: 'Amyloid PET' },
        { label: 'Stack', value: 'Python / TF' },
        { label: 'Status', value: 'In preparation' }
      ],
      pubs: 'Target: EJNMMI Physics · SNMMI 2024 abstract on DL parcellation'
    },
    mriLess: {
      num: '02',
      title: 'MRI-less Amyloid PET',
      problem: 'Many PET/CT studies lack MRI. MRI-dependent pipelines exclude patients and sites.',
      method: ['Synthetic CT', 'Train DL', 'PET/CT infer', 'External val'],
      methodNotes: [
        'Synthetic CT bridges MRI-trained labels to CT space.',
        'Model learns quantification without paired MRI at inference.',
        'Runs on clinical PET/CT.',
        'Checked on held-out external cohorts.'
      ],
      numbers: [
        { label: 'Journal', value: 'EJNMMI Physics' },
        { label: 'When', value: 'Mar 2026' },
        { label: 'Path', value: 'MRI-less' },
        { label: 'Stack', value: 'PyTorch' }
      ],
      pubs: 'doi.org/10.1186/s40658-026-00854-8'
    },
    tcbc: {
      num: '03',
      title: 'TCBC Motion Correction',
      problem: 'Involuntary motion in simultaneous PET/MR misaligns uptake and anatomy, biasing quantification.',
      method: ['Tracer map', 'Region cues', 'Co-register', 'Re-quantify'],
      methodNotes: [
        'Uses tracer uptake characteristics as motion signal.',
        'Regional cues stabilize rigid / affine correction.',
        'Aligns PET frames to anatomical reference.',
        'Improves downstream SUVR stability.'
      ],
      numbers: [
        { label: 'Journal', value: 'EJNMMI Physics' },
        { label: 'When', value: 'Jul 2025' },
        { label: 'Domain', value: 'PET / MR' },
        { label: 'Stack', value: 'MATLAB' }
      ],
      pubs: 'doi.org/10.1186/s40658-025-00789-6'
    }
  }
};
