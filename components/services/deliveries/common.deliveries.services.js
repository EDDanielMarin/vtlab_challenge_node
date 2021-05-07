import Deliveries from '@/models/Deliveries.model';
import Products from '@/models/Products.model';

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 };
  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    };
  }

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: 'We couldn\'t find any delivery'
      }
    };
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  };
};


const filterParams = async (req) => {
  // some vars
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 };
  let from  = new Date(req.body.dateFrom);
  let  to  = new Date(req.body.dateTo);
  let  weight  = req.body.weight;
  const pipeline = [
    {
      $match: {
        when: {
          '$gte': from,
          '$lt' : to
        }
      }
    },
    {
      '$lookup': {
        'from': Products.collection.name,
        'localField': 'products',
        'foreignField': '_id',
        'as': 'products'
      }},
    { '$unwind': '$products' },
    { '$match': { 'products.weight': { '$gt': weight } } },
    { '$group': {
      '_id': '$_id',
      'origin':  { '$first': '$origin' },
      'destination':  { '$first': '$destination' },
      'num':{$sum:1},
      'when':  { '$first': '$when' },
      'products': { '$push': '$products' }
    }},
  ];
  let totalResults = await Deliveries.aggregate([...pipeline]);
  totalResults = totalResults.length;
  if ((!totalResults) || totalResults.totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: 'We couldn\'t find any delivery with this values'
      }
    };
  }
  let deliveries = await Deliveries.aggregate(pipeline).skip(skip).sort(sort).limit(limit);
  return {
    totalResults,
    deliveries
  };
};

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    };
  }
};

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({_id: req.body.id});
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: 'We couldn\'t find a delivery with the sent ID'
      }
    };
  }
  return delivery;
};

export default {
  find,
  create,
  findOne,
  filterParams
};
