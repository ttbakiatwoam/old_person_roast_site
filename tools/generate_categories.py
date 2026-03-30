from pathlib import Path
p=Path('phrases.md')
text=p.read_text(encoding='utf-8')
lines=[l.strip() for l in text.splitlines() if l.strip().startswith('-')]
cat_map=[
 ('Joints/Back/Neck', ['knee','knees','joint','joints','back','neck','spine','shoulder','shoulders','elbow','elbows','hip','hips','ankle','ankles','cartilage']),
 ('Mobility/Stairs/Curbs', ['stairs','staircase','stair','curb','curbs','step','steps'] ),
 ('Sounds', ['sound','noise','click','crack','cracks','pop','maracas','sound design','sound effects','narrat','narration'] ),
 ('Sleep/Recovery', ['sleep','nap','mattress','pillow','bed','recover','recovery','sneeze'] ),
 ('Seating/Chairs', ['chair','chairs','sit','sitting','seat','seats'] ),
 ('Pain/Health', ['hurt','hurts','injur','injury','ache','aches','pain','aching','broken','tissue'] ),
 ('Footwear/Clothing', ['shoe','shoes','slipper','slippers','sock','insoles','footwear','slippers','slippers'] ),
 ('Daily Tasks/Errands', ['errand','errands','grocer','groceries','grocery','laundry','vacuum','carry','drive','parking','jar','jars','shopping','cart']),
 ('Flexibility/Stretching', ['stretch','flexibil','bend','bending','fold','kneel','kneeling','reach','reaching','bend down']),
 ('Attitude/Meta', ['stubborn','stubbornness','denial','sarcasm','complaint','grumble','complaints','caution','maintenance','manual','wisdom','maturity','aging','old','not old','stubbornness','denial','denies','denied','denying']),
 ('Balance/Safety', ['balance','fall','falls','falling','trip','risk','dangerous','slip','slippery']),
 ('Posture', ['posture','postures','slouch','sitting posture','standing posture'])
]

categorized={}
for ln in lines:
    t=ln.lstrip('-').strip()
    lw=t.lower()
    assigned=None
    for cat, kws in cat_map:
        for kw in kws:
            if kw and kw in lw:
                assigned=cat
                break
        if assigned: break
    if not assigned:
        if any(x in lw for x in ['chair','sit','seat']): assigned='Seating/Chairs'
        elif any(x in lw for x in ['knee','joint','back','neck']): assigned='Joints/Back/Neck'
        elif any(x in lw for x in ['shoe','slipper','sock']): assigned='Footwear/Clothing'
        elif any(x in lw for x in ['sleep','nap','mattress','pillow']): assigned='Sleep/Recovery'
        else:
            assigned='Other'
    categorized.setdefault(assigned,[]).append(t)

out=Path('phrases_categorized.md')
with out.open('w',encoding='utf-8') as f:
    f.write('# Categorized Roast Phrases\n\n')
    for cat in sorted(categorized.keys()):
        f.write(f'## {cat}\n\n')
        for it in categorized[cat]:
            f.write(f'- {it}\n')
        f.write('\n')
print('Wrote', out)
